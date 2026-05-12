// Contopia — Migration 001: Create Core Collections & Indexes
// Collections: books, chapters, assets, reading_progress, activity_logs

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function up(db, client) {
  const collections = await db.listCollections().toArray();
  const existingNames = collections.map((c) => c.name);

  // ── Create collections with collation ─────────────────────────────────────────
  const requiredCollections = ['books', 'chapters', 'assets', 'reading_progress', 'activity_logs'];

  for (const name of requiredCollections) {
    if (!existingNames.includes(name)) {
      await db.createCollection(name, {
        collation: { locale: 'pt', strength: 2 },
      });
    }
  }

  // ── Books Indexes ──────────────────────────────────────────────────────────────
  const books = db.collection('books');

  await books.createIndex(
    { authorId: 1, status: 1, deletedAt: 1, createdAt: -1 },
    { partialFilterExpression: { deletedAt: null } }
  );
  await books.createIndex(
    { authorId: 1, createdAt: -1, deletedAt: 1 },
    { partialFilterExpression: { deletedAt: null } }
  );
  await books.createIndex(
    { status: 1, publishedAt: -1, deletedAt: 1 },
    { partialFilterExpression: { deletedAt: null } }
  );
  await books.createIndex({ title: 'text' }, { collation: { locale: 'simple' } });

  // ── Chapters Indexes ──────────────────────────────────────────────────────────
  const chapters = db.collection('chapters');

  await chapters.createIndex(
    { bookId: 1, order: 1, deletedAt: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
  );
  await chapters.createIndex(
    { bookId: 1, deletedAt: 1 },
    { partialFilterExpression: { deletedAt: null } }
  );

  // ── Assets Indexes ─────────────────────────────────────────────────────────────
  const assets = db.collection('assets');

  await assets.createIndex(
    { bookId: 1, type: 1, deletedAt: 1 },
    { partialFilterExpression: { deletedAt: null } }
  );
  await assets.createIndex(
    { authorId: 1, deletedAt: 1 },
    { partialFilterExpression: { deletedAt: null } }
  );

  // ── Reading Progress Indexes ──────────────────────────────────────────────────
  const readingProgress = db.collection('reading_progress');

  await readingProgress.createIndex(
    { userId: 1, bookId: 1 },
    { unique: true }
  );
  await readingProgress.createIndex({ userId: 1, updatedAt: -1 });

  // ── Activity Logs Indexes ──────────────────────────────────────────────────────
  const activityLogs = db.collection('activity_logs');

  await activityLogs.createIndex({ actorId: 1, createdAt: -1 });
  await activityLogs.createIndex({ action: 1, createdAt: -1 });
  await activityLogs.createIndex({ targetId: 1, targetType: 1 });
  // TTL: auto-delete logs after 90 days
  await activityLogs.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  );

  // ── Verify ─────────────────────────────────────────────────────────────────────
  const verifyCollections = await db.listCollections().toArray();
  const verifyNames = verifyCollections.map((c) => c.name);
  for (const name of requiredCollections) {
    if (!verifyNames.includes(name)) {
      throw new Error(`Collection "${name}" was not created`);
    }
  }

  console.log('Migration 001: Core collections and indexes created successfully');
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function down(db, client) {
  const collectionsToDrop = [
    'activity_logs',
    'reading_progress',
    'assets',
    'chapters',
    'books',
  ];

  for (const name of collectionsToDrop) {
    await db.dropCollection(name).catch(() => {
      // Collection may not exist — ignore error
    });
  }

  console.log('Migration 001: Core collections dropped');
}

module.exports = { up, down };