// Contopia — migrate-mongo Configuration
// STORY-004: Points to MongoDB from env, uses migrations/ directory.
//
// NOTE: This file uses .cjs extension because the backend project has
// "type": "module" in package.json and migrate-mongo loads config via require().

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://mongodb:27017/estantedigital';

const config = {
  mongodb: {
    url: MONGODB_URI,
    databaseName: 'estantedigital',
    options: {
      // Mongoose 7+ defaults (migrate-mongo uses MongoClient under the hood)
      // useNewUrlParser: true — deprecated, removed in Mongo driver 4.x+
      // useUnifiedTopology: true — deprecated, always enabled
    },
  },

  // The migrations dir, relative to this config file
  migrationsDir: 'migrations',

  // The collection where migrate-mongo stores its changelog
  changelogCollectionName: 'migrations_changelog',

  // The file extension for migration files
  migrationFileExtension: '.js',

  // Don't use SSL/TLS by default; enable via env for staging/prod
  useFileHash: false,

  moduleSystem: 'commonjs',
};

module.exports = config;
