// Contopia — Migration 003: Pivot Auth Models (ParentAccount + ChildProfile)
// STORY-056: Removes magic-link fields, adds lastLogin/avatarSeed, sets isActive=true.
// This migration is additive — it does NOT drop fields from existing documents.
// Old magic-link fields (verificationToken, isVerified, etc.) remain in DB but
// are no longer read/written by the application layer.

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function up(db, client) {
  console.log('  Running migration 003: Pivot auth models...');

  // ── Parents collection ──────────────────────────────────────────────────────
  const parents = db.collection('parents');

  // Add lastLogin default to parents without it
  const parentsResult = await parents.updateMany(
    { lastLogin: { $exists: false } },
    { $set: { lastLogin: null } }
  );
  console.log(`    ✓ ${parentsResult.modifiedCount} parents updated with lastLogin: null`);

  // ── Children collection ─────────────────────────────────────────────────────
  const children = db.collection('children');

  // Set isActive=true on all children that lack it or have it as false
  const activeResult = await children.updateMany(
    { isActive: { $ne: true } },
    { $set: { isActive: true } }
  );
  console.log(`    ✓ ${activeResult.modifiedCount} children updated with isActive: true`);

  // Add avatarSeed default to children without it
  const avatarResult = await children.updateMany(
    { avatarSeed: { $exists: false } },
    { $set: { avatarSeed: 'avatar_default' } }
  );
  console.log(`    ✓ ${avatarResult.modifiedCount} children updated with avatarSeed: 'avatar_default'`);

  // ── Indexes ──────────────────────────────────────────────────────────────────
  // Ensure parentId index exists on children collection (for dashboard queries)
  const existingIndexes = await children.indexes();
  const parentIdIndexExists = existingIndexes.some(
    (idx) => idx.key && idx.key.parentId === 1 && Object.keys(idx.key).length === 1
  );

  if (!parentIdIndexExists) {
    await children.createIndex({ parentId: 1 });
    console.log('    ✓ Created parentId index on children collection');
  } else {
    console.log('    ✓ parentId index on children already exists');
  }

  console.log('\n  003-pivot-parent-child UP complete.\n');
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function down(db, client) {
  console.log('  Rolling back migration 003: Pivot auth models...');

  const parents = db.collection('parents');
  const children = db.collection('children');

  // Remove lastLogin from parents
  const parentsResult = await parents.updateMany(
    {},
    { $unset: { lastLogin: '' } }
  );
  console.log(`    ✓ Removed lastLogin from ${parentsResult.modifiedCount} parents`);

  // Remove avatarSeed from children
  const avatarResult = await children.updateMany(
    {},
    { $unset: { avatarSeed: '' } }
  );
  console.log(`    ✓ Removed avatarSeed from ${avatarResult.modifiedCount} children`);

  // Note: isActive is NOT reverted — setting it back to false could break existing active children.
  // The migration up() sets isActive=true which is the desired pivot state.
  // Indexes will be cleaned up by Mongoose on model reload.

  console.log('\n  003-pivot-parent-child DOWN complete.\n');
}

module.exports = { up, down };