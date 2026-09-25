const { loadConfig } = require('../config');

describe('loadConfig', () => {
  it('usa padrões em desenvolvimento', () => {
    const config = loadConfig({});
    expect(config.port).toBe(8000);
    expect(config.isProduction).toBe(false);
  });

  it('recusa produção sem JWT_SECRET forte', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', MONGODB_URI: 'x', REDIS_URL: 'y', JWT_SECRET: 'curto' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('aceita produção completa', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://m/contopia',
      REDIS_URL: 'redis://r',
      JWT_SECRET: 'a'.repeat(40),
    });
    expect(config.isProduction).toBe(true);
  });
});
