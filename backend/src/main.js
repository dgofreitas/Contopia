const mongoose = require('mongoose');
const Redis = require('ioredis');
const { loadConfig } = require('./config');
const { createApp } = require('./app');

async function main() {
  const config = loadConfig();

  await mongoose.connect(config.mongodbUri);
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });

  const app = createApp({ mongoose, redis });
  const server = app.listen(config.port, () => {
    console.log(`Contopia API ouvindo na porta ${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} recebido, encerrando`);
    server.close();
    await Promise.allSettled([mongoose.disconnect(), redis.quit()]);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
