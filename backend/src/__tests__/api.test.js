/**
 * Testes de ponta a ponta da API contra MongoDB e Redis de verdade.
 * Localmente: docker run -p 27017:27017 mongo:7.0 e docker run -p 6379:6379 redis:7.2-alpine
 */
const mongoose = require('mongoose');
const Redis = require('ioredis');
const request = require('supertest');
const { createApp } = require('../app');

const MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/contopia_test';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379/15';

let redis;
let app;

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
  redis = new Redis(REDIS_URL);
  app = createApp({ mongoose, redis, config: {} });
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
    expect(family.body.children).toEqual([{ id: child.id, nickname: 'Lia', avatar: '🦊' }]);

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

describe('livros', () => {
  async function childAgent() {
    const { agent, child } = await withChild();
    await agent.post('/api/v1/auth/switch').send({ childId: child.id });
    return { agent, child };
  }

  it('cria, escreve, favorita e marca o progresso', async () => {
    const { agent } = await childAgent();
    const created = await agent.post('/api/v1/books').send({ title: 'O Dragão Tímido', cover: { color: '#E8559A', sticker: '🐉' } });
    expect(created.status).toBe(201);
    const id = created.body.book.id;
    expect(created.body.book.chapters).toEqual([{ title: 'Capítulo 1', html: '' }]);

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
