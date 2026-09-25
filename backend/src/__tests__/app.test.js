const request = require('supertest');
const { createApp } = require('../app');

function fakeDeps({ mongoState = 1, ping = async () => 'PONG' } = {}) {
  return {
    mongoose: { connection: { readyState: mongoState } },
    redis: { ping },
  };
}

describe('GET /health', () => {
  it('responde 200 quando Mongo e Redis estão de pé', async () => {
    const res = await request(createApp(fakeDeps())).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', mongo: 'ok', redis: 'ok' });
  });

  it('responde 503 quando o Mongo caiu', async () => {
    const res = await request(createApp(fakeDeps({ mongoState: 0 }))).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.mongo).toBe('down');
  });

  it('responde 503 quando o Redis não responde', async () => {
    const ping = async () => {
      throw new Error('ECONNREFUSED');
    };
    const res = await request(createApp(fakeDeps({ ping }))).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.redis).toBe('down');
  });
});

describe('API', () => {
  it('GET /api/v1 identifica o serviço', async () => {
    const res = await request(createApp(fakeDeps())).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('contopia');
  });

  it('rota desconhecida devolve 404 em JSON', async () => {
    const res = await request(createApp(fakeDeps())).get('/api/v1/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
