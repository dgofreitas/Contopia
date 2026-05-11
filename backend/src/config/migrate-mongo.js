// Contopia — migrate-mongo Configuration
// ESM-compatible config for migrate-mongo CLI
const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://mongodb:27017/estantedigital',
    databaseName: 'estantedigital',
    options: {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
};

export default config;