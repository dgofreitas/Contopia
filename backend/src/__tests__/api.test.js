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

  it('exige um perfil de criança ativo', async () => {
    const { agent } = await registerParent();
    expect((await agent.get('/api/v1/books')).status).toBe(403);
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
