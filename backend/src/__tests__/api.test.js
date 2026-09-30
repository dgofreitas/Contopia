/**
 * Testes de ponta a ponta da API contra MongoDB e Redis de verdade.
 * Localmente: docker run -p 27017:27017 mongo:7.0 e docker run -p 6379:6379 redis:7.2-alpine
 */
const mongoose = require('mongoose');
const Redis = require('ioredis');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { createApp } = require('../app');

const MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/contopia_test';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379/15';

let redis;
let app;
let uploadsDir;

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
  redis = new Redis(REDIS_URL);
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contopia-uploads-'));
  app = createApp({ mongoose, redis, config: { uploadsDir } });
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.syncIndexes();
  await redis.flushdb();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await redis.quit();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

const PICTURE = [0, 3, 5, 8];

async function registerParent(email = 'mae@exemplo.com') {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'segredo-forte', consent: true });
  expect(res.status).toBe(201);
  return { agent, parent: res.body.parent };
}

async function withChild(nickname = 'Lia') {
  const { agent, parent } = await registerParent();
  const res = await agent.post('/api/v1/children').send({ nickname, avatar: '🦊', picture: PICTURE });
  expect(res.status).toBe(201);
  return { agent, parent, child: res.body.child };
}

describe('cadastro e login do responsável', () => {
  it('cadastra, mantém a sessão e gera um código de família', async () => {
    const { agent, parent } = await registerParent();
    expect(parent.familyCode).toMatch(/^[A-Z2-9]{8}$/);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.body).toMatchObject({ role: 'parent', parent: { email: 'mae@exemplo.com' }, child: null });
  });

  it('exige o consentimento', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com', password: 'segredo-forte', consent: false });
    expect(res.status).toBe(400);
  });

  it('recusa e-mail repetido', async () => {
    await registerParent('x@y.com');
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'X@y.com', password: 'segredo-forte', consent: true });
    expect(res.status).toBe(409);
  });

  it('faz login e logout', async () => {
    await registerParent('p@q.com');
    const agent = request.agent(app);
    expect((await agent.post('/api/v1/auth/login').send({ email: 'p@q.com', password: 'errada-errada' })).status).toBe(401);
    expect((await agent.post('/api/v1/auth/login').send({ email: 'p@q.com', password: 'segredo-forte' })).status).toBe(200);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(200);
    await agent.post('/api/v1/auth/logout');
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('recusa escrita que não seja JSON', async () => {
    const res = await request(app).post('/api/v1/auth/login').type('form').send('email=a@b.com&password=x');
    expect(res.status).toBe(415);
  });
});

describe('código e nome da família', () => {
  it('troca o código por um escolhido ou aleatório', async () => {
    const { agent, child } = await withChild();

    expect((await agent.patch('/api/v1/auth/me/family-code').send({ code: 'Freitas' })).status).toBe(400);
    expect((await agent.patch('/api/v1/auth/me/family-code').send({ code: '123456' })).status).toBe(400);
    const custom = await agent.patch('/api/v1/auth/me/family-code').send({ code: 'Freitas123' });
    expect(custom.body.parent.familyCode).toBe('FREITAS123');

    const kid = request.agent(app);
    const login = await kid.post('/api/v1/auth/child/login').send({ familyCode: 'freitas123', childId: child.id, picture: PICTURE });
    expect(login.status).toBe(200);

    const random = await agent.patch('/api/v1/auth/me/family-code').send({});
    expect(random.body.parent.familyCode).toMatch(/^[A-Z2-9]{8}$/);
    expect((await request(app).get('/api/v1/auth/family/FREITAS123')).status).toBe(404);

    const other = await registerParent('pai@exemplo.com');
    await agent.patch('/api/v1/auth/me/family-code').send({ code: 'Freitas123' });
    const taken = await other.agent.patch('/api/v1/auth/me/family-code').send({ code: 'FREITAS123' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('FAMILY_CODE_TAKEN');
  });

  it('dá um nome público que não abre a entrada das crianças', async () => {
    const { agent } = await withChild();
    const named = await agent.patch('/api/v1/auth/me/family-name').send({ name: 'Freitas' });
    expect(named.body.parent.familyName).toBe('freitas');
    expect((await request(app).get('/api/v1/auth/family/freitas')).status).toBe(404);

    // Código e nome iguais deixariam o código público.
    await agent.patch('/api/v1/auth/me/family-code').send({ code: 'Freitas1' });
    const same = await agent.patch('/api/v1/auth/me/family-name').send({ name: 'freitas1' });
    expect(same.body.error.code).toBe('FAMILY_CODE_IS_NAME');

    const other = await registerParent('pai@exemplo.com');
    const taken = await other.agent.patch('/api/v1/auth/me/family-name').send({ name: 'FREITAS' });
    expect(taken.body.error.code).toBe('FAMILY_NAME_TAKEN');

    const removed = await agent.patch('/api/v1/auth/me/family-name').send({ name: null });
    expect(removed.body.parent.familyName).toBeNull();
    expect((await other.agent.patch('/api/v1/auth/me/family-name').send({ name: 'freitas' })).body.parent.familyName).toBe('freitas');
  });

  it('só o responsável troca', async () => {
    const { parent, child } = await withChild();
    const kid = request.agent(app);
    await kid.post('/api/v1/auth/child/login').send({ familyCode: parent.familyCode, childId: child.id, picture: PICTURE });
    expect((await kid.patch('/api/v1/auth/me/family-code').send({})).status).toBe(403);
    expect((await kid.patch('/api/v1/auth/me/family-name').send({ name: 'hacker' })).status).toBe(403);
  });
});

describe('entrada da criança com senha de figuras', () => {
  it('encontra a família e entra com a sequência certa', async () => {
    const { parent, child } = await withChild();
    const family = await request(app).get(`/api/v1/auth/family/${parent.familyCode.toLowerCase()}`);
    expect(family.body.children).toEqual([{ id: child.id, nickname: 'Lia', avatar: '🦊', methods: ['picture'] }]);

    const kid = request.agent(app);
    const res = await kid.post('/api/v1/auth/child/login').send({ familyCode: parent.familyCode, childId: child.id, picture: PICTURE });
    expect(res.status).toBe(200);
    const me = await kid.get('/api/v1/auth/me');
    expect(me.body).toMatchObject({ role: 'child', child: { nickname: 'Lia' }, parent: null });
  });

  it('bloqueia depois de 5 erros', async () => {
    const { parent, child } = await withChild();
    const attempt = (picture) =>
      request(app).post('/api/v1/auth/child/login').send({ familyCode: parent.familyCode, childId: child.id, picture });
    for (let i = 0; i < 5; i += 1) expect((await attempt([1, 1, 1, 1])).status).toBe(401);
    expect((await attempt(PICTURE)).status).toBe(429);
  });

  it('para de procurar famílias depois de muitos códigos errados', async () => {
    const { parent } = await withChild();
    for (let i = 0; i < 20; i += 1) expect((await request(app).get(`/api/v1/auth/family/CHUTE${i}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/auth/family/${parent.familyCode}`)).status).toBe(429);
  });

  it('a criança não administra perfis', async () => {
    const { parent, child } = await withChild();
    const kid = request.agent(app);
    await kid.post('/api/v1/auth/child/login').send({ familyCode: parent.familyCode, childId: child.id, picture: PICTURE });
    expect((await kid.get('/api/v1/children')).status).toBe(403);
  });
});

describe('entrada da criança com senha normal', () => {
  it('cria o perfil só com senha e entra com ela', async () => {
    const { agent, parent } = await registerParent();
    const created = await agent.post('/api/v1/children').send({ nickname: 'Leo', avatar: '🐼', password: 'leo123' });
    expect(created.status).toBe(201);
    expect(created.body.child.methods).toEqual(['text']);

    const login = (body) =>
      request(app).post('/api/v1/auth/child/login').send({ familyCode: parent.familyCode, childId: created.body.child.id, ...body });
    expect((await login({ password: 'errada' })).body.error.code).toBe('INVALID_TEXT_PASSWORD');
    expect((await login({ picture: PICTURE })).status).toBe(401);
    expect((await login({ password: 'leo123' })).status).toBe(200);
  });

  it('o responsável acrescenta a senha normal e não pode tirar os dois jeitos', async () => {
    const { agent, parent, child } = await withChild();
    const added = await agent.patch(`/api/v1/children/${child.id}`).send({ password: 'lia2024' });
    expect(added.body.child.methods).toEqual(['picture', 'text']);

    const res = await request(app)
      .post('/api/v1/auth/child/login')
      .send({ familyCode: parent.familyCode, childId: child.id, password: 'lia2024' });
    expect(res.status).toBe(200);

    expect((await agent.patch(`/api/v1/children/${child.id}`).send({ picture: null })).status).toBe(200);
    const none = await agent.patch(`/api/v1/children/${child.id}`).send({ password: null });
    expect(none.body.error.code).toBe('LOGIN_METHOD_REQUIRED');
  });

  it('recusa perfil sem nenhum jeito de entrar e login com os dois ao mesmo tempo', async () => {
    const { agent, parent, child } = await withChild();
    expect((await agent.post('/api/v1/children').send({ nickname: 'Bia', avatar: '🐼' })).status).toBe(400);
    const both = await request(app)
      .post('/api/v1/auth/child/login')
      .send({ familyCode: parent.familyCode, childId: child.id, picture: PICTURE, password: 'x' });
    expect(both.status).toBe(400);
  });
});

describe('livros', () => {
  async function childAgent() {
    const { agent, child } = await withChild();
    await agent.post('/api/v1/auth/switch').send({ childId: child.id });
    return { agent, child };
  }

  it('cria, escreve, favorita e marca o progresso', async () => {
    const { agent } = await childAgent();
    const created = await agent.post('/api/v1/books').send({ title: 'O Dragão Tímido', cover: { color: '#E8559A', sticker: '🐉' }, chaptered: true });
    expect(created.status).toBe(201);
    const id = created.body.book.id;
    expect(created.body.book).toMatchObject({ chaptered: true, chapters: [{ title: 'Capítulo 1', html: '' }] });

    const saved = await agent.patch(`/api/v1/books/${id}`).send({
      favorite: true,
      chapters: [{ title: 'O começo', html: '<p>Era uma vez <strong>um dragão</strong><script>alert(1)</script></p>' }],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.book.chapters[0].html).toBe('<p>Era uma vez <strong>um dragão</strong></p>');
    expect(saved.body.book.favorite).toBe(true);

    await agent.put(`/api/v1/books/${id}/progress`).send({ chapter: 0, page: 2 });
    const list = await agent.get('/api/v1/books');
    expect(list.body.books[0]).toMatchObject({ title: 'O Dragão Tímido', favorite: true, progress: { chapter: 0, page: 2 } });
  });

  it('cria livro sem capítulos e troca entre os dois jeitos', async () => {
    const { agent } = await childAgent();
    const created = await agent.post('/api/v1/books').send({ title: 'Diário de férias', cover: { color: '#7C5CFF' } });
    expect(created.body.book).toMatchObject({ chaptered: false, chapters: [{ title: '', html: '' }] });
    const id = created.body.book.id;

    const tooMany = await agent.patch(`/api/v1/books/${id}`).send({ chapters: [{ html: '<p>a</p>' }, { html: '<p>b</p>' }] });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.code).toBe('CHAPTERLESS_SINGLE_TEXT');

    const split = await agent.patch(`/api/v1/books/${id}`).send({
      chaptered: true,
      chapters: [{ title: 'Um', html: '<p>a</p>' }, { title: 'Dois', html: '<p>b</p>' }],
    });
    expect(split.body.book).toMatchObject({ chaptered: true, chapters: [{ title: 'Um' }, { title: 'Dois' }] });

    const joined = await agent.patch(`/api/v1/books/${id}`).send({ chaptered: false, chapters: [{ title: 'Um', html: '<p>a</p><p>b</p>' }] });
    expect(joined.body.book).toMatchObject({ chaptered: false, chapters: [{ title: '', html: '<p>a</p><p>b</p>' }] });
  });

  it('livro novo fica no ateliê até ser publicado', async () => {
    const { agent, child } = await childAgent();
    const { body } = await agent.post('/api/v1/books').send({ title: 'Rascunho', cover: { color: '#7C5CFF' } });
    expect(body.book.published).toBe(false);

    const published = await agent.patch(`/api/v1/books/${body.book.id}`).send({ published: true });
    expect(published.body.book.published).toBe(true);
    const back = await agent.patch(`/api/v1/books/${body.book.id}`).send({ published: false });
    expect(back.body.book.published).toBe(false);
    await agent.patch(`/api/v1/books/${body.book.id}`).send({ published: true });

    // Livro de antes do ateliê, sem o campo, continua na estante.
    await mongoose.connection.db.collection('books').insertOne({
      childId: new mongoose.Types.ObjectId(child.id), title: 'Antigo', cover: { color: '#7C5CFF' }, chapters: [{ title: '', html: '' }],
    });
    const list = await agent.get('/api/v1/books');
    expect(list.body.books.find((b) => b.title === 'Antigo').published).toBe(true);
  });

  it('mantém cores e estilos permitidos do editor', async () => {
    const { agent } = await childAgent();
    const { body } = await agent.post('/api/v1/books').send({ title: 'Cores', cover: { color: '#7C5CFF' } });
    const html = '<p style="text-align: center"><span style="color: #e8559a; font-family: Grandstander; font-size: 24px">oi</span></p>';
    const saved = await agent.patch(`/api/v1/books/${body.book.id}`).send({ chapters: [{ title: '', html }] });
    expect(saved.body.book.chapters[0].html).toContain('color:#e8559a');
    expect(saved.body.book.chapters[0].html).toContain('text-align:center');
  });

  it('uma criança não vê o livro de outra', async () => {
    const { agent } = await childAgent();
    const { body } = await agent.post('/api/v1/books').send({ title: 'Segredo', cover: { color: '#7C5CFF' } });

    const other = await request(app).post('/api/v1/children');
    expect(other.status).toBe(401);

    const second = await agent.post('/api/v1/children').send({ nickname: 'Leo', avatar: '🐼', picture: PICTURE });
    await agent.post('/api/v1/auth/switch').send({ childId: second.body.child.id });
    expect((await agent.get(`/api/v1/books/${body.book.id}`)).status).toBe(404);
    expect((await agent.get('/api/v1/books')).body.books).toEqual([]);
  });

  it('irmãos leem os livros publicados para a família, sem poder mudar', async () => {
    const { agent, child } = await childAgent();
    const { body } = await agent.post('/api/v1/books').send({ title: 'Para o Leo', cover: { color: '#7C5CFF' } });
    const id = body.book.id;
    await agent.patch(`/api/v1/books/${id}`).send({ favorite: true, chapters: [{ title: '', html: '<p>Oi, Leo!</p>' }] });
    const leo = await agent.post('/api/v1/children').send({ nickname: 'Leo', avatar: '🐼', picture: PICTURE });
    const asLeo = () => agent.post('/api/v1/auth/switch').send({ childId: leo.body.child.id });
    const asLia = () => agent.post('/api/v1/auth/switch').send({ childId: child.id });

    // Rascunho e livro publicado só para a própria criança ficam escondidos.
    await asLeo();
    expect((await agent.get('/api/v1/books/family')).body.children).toEqual([]);
    expect((await agent.get(`/api/v1/books/${id}`)).status).toBe(404);
    await asLia();
    await agent.patch(`/api/v1/books/${id}`).send({ published: true });
    await asLeo();
    expect((await agent.get(`/api/v1/books/${id}`)).status).toBe(404);

    await asLia();
    const shared = await agent.patch(`/api/v1/books/${id}`).send({ visibility: 'family' });
    expect(shared.body.book.visibility).toBe('family');
    await asLeo();
    const family = await agent.get('/api/v1/books/family');
    expect(family.body.children).toEqual([
      expect.objectContaining({ nickname: 'Lia', books: [expect.objectContaining({ id, title: 'Para o Leo', author: expect.objectContaining({ nickname: 'Lia' }) })] }),
    ]);
    const read = await agent.get(`/api/v1/books/${id}`);
    expect(read.body.book).toMatchObject({ mine: false, chapters: [{ html: '<p>Oi, Leo!</p>' }] });
    expect(read.body.book.favorite).toBeUndefined();
    expect(read.body.book.progress).toBeUndefined();

    // Ler pode; escrever, apagar e marcar progresso não.
    expect((await agent.patch(`/api/v1/books/${id}`).send({ title: 'Meu!' })).status).toBe(404);
    expect((await agent.put(`/api/v1/books/${id}/progress`).send({ chapter: 0, page: 1 })).status).toBe(404);
    expect((await agent.delete(`/api/v1/books/${id}`)).status).toBe(404);

    // Outra família não enxerga.
    const other = await registerParent('pai@exemplo.com');
    const kid = await other.agent.post('/api/v1/children').send({ nickname: 'Bia', avatar: '🦊', picture: PICTURE });
    await other.agent.post('/api/v1/auth/switch').send({ childId: kid.body.child.id });
    expect((await other.agent.get(`/api/v1/books/${id}`)).status).toBe(404);
    expect((await other.agent.get('/api/v1/books/family')).body.children).toEqual([]);
  });

  it('exige um perfil de criança ativo', async () => {
    const { agent } = await registerParent();
    expect((await agent.get('/api/v1/books')).status).toBe(403);
  });
});

describe('famílias amigas e livros para pessoas escolhidas', () => {
  // Responsável com nome público e uma criança, já usando o perfil dela.
  async function family(email, name, nickname) {
    const { agent } = await registerParent(email);
    if (name) await agent.patch('/api/v1/auth/me/family-name').send({ name });
    const { body } = await agent.post('/api/v1/children').send({ nickname, avatar: '🦊', picture: PICTURE });
    await agent.post('/api/v1/auth/switch').send({ childId: body.child.id });
    return { agent, child: body.child };
  }

  it('convida, aceita e desfaz a amizade entre famílias', async () => {
    const silva = await family('silva@exemplo.com', 'silva', 'Lia');
    const souza = await family('souza@exemplo.com', 'souza', 'Leo');
    const semNome = await family('outra@exemplo.com', null, 'Bia');

    expect((await semNome.agent.post('/api/v1/connections').send({ name: 'silva' })).body.error.code).toBe('FAMILY_NAME_REQUIRED');
    expect((await silva.agent.post('/api/v1/connections').send({ name: 'ninguem' })).status).toBe(404);
    expect((await silva.agent.post('/api/v1/connections').send({ name: 'silva' })).body.error.code).toBe('SELF_LINK');

    const invite = await silva.agent.post('/api/v1/connections').send({ name: '@Souza' });
    expect(invite.body.link).toMatchObject({ familyName: 'souza', status: 'pending' });
    expect((await silva.agent.post('/api/v1/connections').send({ name: 'souza' })).status).toBe(409);
    expect((await silva.agent.get('/api/v1/connections')).body.outgoing).toEqual([{ id: invite.body.link.id, familyName: 'souza' }]);

    // Antes de aceitar, as crianças não se enxergam.
    expect((await silva.agent.get('/api/v1/books/friends')).body.families).toEqual([]);
    // Quem convidou não pode aceitar o próprio convite.
    expect((await silva.agent.post(`/api/v1/connections/${invite.body.link.id}/accept`)).status).toBe(400);

    const pending = await souza.agent.get('/api/v1/connections');
    expect(pending.body.incoming).toEqual([{ id: invite.body.link.id, familyName: 'silva' }]);
    expect((await souza.agent.post(`/api/v1/connections/${invite.body.link.id}/accept`)).status).toBe(200);

    const friends = await silva.agent.get('/api/v1/books/friends');
    expect(friends.body.families).toEqual([{ familyName: 'souza', children: [{ id: souza.child.id, nickname: 'Leo', avatar: '🦊' }] }]);
    expect((await semNome.agent.post(`/api/v1/connections/${invite.body.link.id}/accept`)).status).toBe(404);

    expect((await souza.agent.delete(`/api/v1/connections/${invite.body.link.id}`)).status).toBe(204);
    expect((await silva.agent.get('/api/v1/books/friends')).body.families).toEqual([]);
  });

  it('convite cruzado vira amizade na hora', async () => {
    const silva = await family('silva@exemplo.com', 'silva', 'Lia');
    const souza = await family('souza@exemplo.com', 'souza', 'Leo');
    await silva.agent.post('/api/v1/connections').send({ name: 'souza' });
    const back = await souza.agent.post('/api/v1/connections').send({ name: 'silva' });
    expect(back.body.link.status).toBe('accepted');
  });

  it('manda o livro só para as crianças escolhidas de famílias amigas', async () => {
    const silva = await family('silva@exemplo.com', 'silva', 'Lia');
    const souza = await family('souza@exemplo.com', 'souza', 'Leo');
    const leo2 = await souza.agent.post('/api/v1/children').send({ nickname: 'Davi', avatar: '🐼', picture: PICTURE });
    const estranho = await family('x@exemplo.com', 'estranhos', 'Zé');
    const { body: invite } = await silva.agent.post('/api/v1/connections').send({ name: 'souza' });
    await souza.agent.post(`/api/v1/connections/${invite.link.id}/accept`);

    const { body } = await silva.agent.post('/api/v1/books').send({ title: 'Para o Leo', cover: { color: '#7C5CFF' } });
    const id = body.book.id;
    await silva.agent.patch(`/api/v1/books/${id}`).send({ chapters: [{ title: '', html: '<p>Oi!</p>' }] });

    // Só crianças de família amiga, e pelo menos uma.
    expect((await silva.agent.patch(`/api/v1/books/${id}`).send({ visibility: 'people', sharedWith: [estranho.child.id] })).body.error.code).toBe('INVALID_SHARE');
    expect((await silva.agent.patch(`/api/v1/books/${id}`).send({ visibility: 'people', sharedWith: [] })).body.error.code).toBe('SHARE_NOBODY');

    const published = await silva.agent.patch(`/api/v1/books/${id}`).send({ published: true, visibility: 'people', sharedWith: [souza.child.id] });
    expect(published.body.book).toMatchObject({ visibility: 'people', sharedWith: [souza.child.id] });

    // Leo lê; Davi, da mesma família, não foi escolhido.
    const forLeo = await souza.agent.get('/api/v1/books/family');
    expect(forLeo.body.friends).toEqual([
      expect.objectContaining({ nickname: 'Lia', familyName: 'silva', books: [expect.objectContaining({ id, author: expect.objectContaining({ familyName: 'silva' }) })] }),
    ]);
    const read = await souza.agent.get(`/api/v1/books/${id}`);
    expect(read.body.book).toMatchObject({ mine: false, chapters: [{ html: '<p>Oi!</p>' }] });
    expect(read.body.book.sharedWith).toBeUndefined();
    expect((await souza.agent.patch(`/api/v1/books/${id}`).send({ title: 'Meu!' })).status).toBe(404);

    await souza.agent.post('/api/v1/auth/switch').send({ childId: leo2.body.child.id });
    expect((await souza.agent.get(`/api/v1/books/${id}`)).status).toBe(404);
    expect((await souza.agent.get('/api/v1/books/family')).body.friends).toEqual([]);
    expect((await estranho.agent.get(`/api/v1/books/${id}`)).status).toBe(404);

    // Desfeita a amizade, o livro deixa de ser do Leo também.
    await souza.agent.post('/api/v1/auth/switch').send({ childId: souza.child.id });
    await silva.agent.delete(`/api/v1/connections/${invite.link.id}`);
    expect((await souza.agent.get(`/api/v1/books/${id}`)).status).toBe(404);
    const after = await silva.agent.get(`/api/v1/books/${id}`);
    expect(after.body.book).toMatchObject({ sharedWith: [], visibility: 'private' });
    // E o autosave do editor continua funcionando.
    expect((await silva.agent.patch(`/api/v1/books/${id}`).send({ chapters: [{ title: '', html: '<p>Oi de novo!</p>' }] })).status).toBe(200);
  });
});

describe('imagens no texto', () => {
  async function bookAgent() {
    const { agent, child } = await withChild();
    await agent.post('/api/v1/auth/switch').send({ childId: child.id });
    const { body } = await agent.post('/api/v1/books').send({ title: 'Com figuras', cover: { color: '#7C5CFF' } });
    return { agent, bookId: body.book.id };
  }

  const png = (width, height) => sharp({ create: { width, height, channels: 3, background: '#e8559a' } }).png().toBuffer();

  it('envia, reduz, mostra no texto e só para o dono', async () => {
    const { agent, bookId } = await bookAgent();
    const sent = await agent.post(`/api/v1/books/${bookId}/images`).set('Content-Type', 'image/png').send(await png(3000, 1500));
    expect(sent.status).toBe(201);
    expect(sent.body.image).toMatchObject({ width: 1200, height: 600 });
    const { url } = sent.body.image;
    expect(url).toMatch(new RegExp(`^/api/v1/books/${bookId}/images/[a-f0-9]{24}$`));

    const shown = await agent.get(url).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(shown.status).toBe(200);
    expect(shown.headers['content-type']).toBe('image/webp');
    expect((await sharp(shown.body).metadata()).format).toBe('webp');

    const html = `<p>oi</p><img src="${url}" alt="dragão" data-size="medium"><img src="https://exemplo.com/x.png"><img src="/api/v1/books/${'a'.repeat(24)}/images/${'b'.repeat(24)}">`;
    const saved = await agent.patch(`/api/v1/books/${bookId}`).send({ chapters: [{ title: '', html }] });
    expect(saved.body.book.chapters[0].html).toBe(`<p>oi</p><img src="${url}" alt="dragão" data-size="medium" />`);

    expect((await request(app).get(url)).status).toBe(401);
    const second = await agent.post('/api/v1/children').send({ nickname: 'Leo', avatar: '🐼', picture: PICTURE });
    await agent.post('/api/v1/auth/switch').send({ childId: second.body.child.id });
    expect((await agent.get(url)).status).toBe(404);
  });

  it('recusa arquivo que não é imagem', async () => {
    const { agent, bookId } = await bookAgent();
    const fake = await agent.post(`/api/v1/books/${bookId}/images`).set('Content-Type', 'image/png').send(Buffer.from('não sou imagem'));
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('IMAGE_INVALID');
    const pdf = await agent.post(`/api/v1/books/${bookId}/images`).set('Content-Type', 'application/pdf').send(Buffer.from('%PDF'));
    expect(pdf.status).toBe(415);
  });

  it('apaga as imagens junto com o livro', async () => {
    const { agent, bookId } = await bookAgent();
    await agent.post(`/api/v1/books/${bookId}/images`).set('Content-Type', 'image/png').send(await png(10, 10));
    expect(fs.readdirSync(path.join(uploadsDir, 'books', bookId))).toHaveLength(1);
    await agent.delete(`/api/v1/books/${bookId}`);
    expect(fs.existsSync(path.join(uploadsDir, 'books', bookId))).toBe(false);
  });
});
