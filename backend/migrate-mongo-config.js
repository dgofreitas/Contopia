// Contopia — migrate-mongo Configuration
// migrate-mongo expects this file at project root with default name.
// ESM export — migrate-mongo loader handles both CJS and ESM.
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