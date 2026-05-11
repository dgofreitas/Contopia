// Contopia — Migration 002: Seed Dev Data
// STORY-004: Seeds 3 sample books with chapters, 1 asset, 1 reading progress.
// Skips automatically if NODE_ENV is 'production'.

const { ObjectId } = require('mongoose').Types;

// ── Deterministic IDs for idempotency ────────────────────────────────────────
const SEED = {
  // Use a fake Child/author — won't clash with real data since migrations seed
  // with known IDs. In dev, these reference a placeholder author.
  authorId: new ObjectId('000000000000000000000001'),

  books: [
    {
      _id: new ObjectId('100000000000000000000001'),
      title: 'A Aventura no Espaço',
      description: 'Julia viaja pelo espaço com seu robô de estimação.',
      status: 'published',
      publishedAt: new Date('2026-05-01'),
      language: 'pt-BR',
    },
    {
      _id: new ObjectId('100000000000000000000002'),
      title: 'O Jardim Secreto',
      description: 'Um jardim mágico onde as flores falam e as árvores cantam.',
      status: 'published',
      publishedAt: new Date('2026-05-05'),
      language: 'pt-BR',
    },
    {
      _id: new ObjectId('100000000000000000000003'),
      title: 'Meu Diário de Dragões',
      description: 'As aventuras de uma treinadora de dragões e seus amigos.',
      status: 'draft',
      language: 'pt-BR',
    },
  ],

  chapters: [
    // Book 1 chapters (5)
    { _id: new ObjectId('200000000000000000000001'), bookId: new ObjectId('100000000000000000000001'), order: 100, title: 'Capítulo 1: A Contagem Regressiva', content: '<p>Era uma manhã ensolarada quando Julia recebeu a notícia...</p>', wordCount: 120 },
    { _id: new ObjectId('200000000000000000000002'), bookId: new ObjectId('100000000000000000000001'), order: 200, title: 'Capítulo 2: Rumo às Estrelas', content: '<p>O foguete subiu pelos céus azuis até que a Terra ficou pequenina...</p>', wordCount: 95 },
    { _id: new ObjectId('200000000000000000000003'), bookId: new ObjectId('100000000000000000000001'), order: 300, title: 'Capítulo 3: O Planeta Roxo', content: '<p>O robô Bip apontou para um planeta roxo no horizonte...</p>', wordCount: 110 },
    { _id: new ObjectId('200000000000000000000004'), bookId: new ObjectId('100000000000000000000001'), order: 400, title: 'Capítulo 4: Novos Amigos', content: '<p>Os alienígenas do planeta roxo eram pequenos e azuis...</p>', wordCount: 85 },
    { _id: new ObjectId('200000000000000000000005'), bookId: new ObjectId('100000000000000000000001'), order: 500, title: 'Capítulo 5: A Volta para Casa', content: '<p>Com o coração cheio de saudades, Julia deu adeus aos amigos...</p>', wordCount: 130 },

    // Book 2 chapters (4)
    { _id: new ObjectId('200000000000000000000006'), bookId: new ObjectId('100000000000000000000002'), order: 100, title: 'Capítulo 1: A Chave Perdida', content: '<p>Julia encontrou uma chave dourada debaixo da velha cerejeira...</p>', wordCount: 100 },
    { _id: new ObjectId('200000000000000000000007'), bookId: new ObjectId('100000000000000000000002'), order: 200, title: 'Capítulo 2: O Portal', content: '<p>A chave abriu um portal entre as flores do jardim...</p>', wordCount: 75 },
    { _id: new ObjectId('200000000000000000000008'), bookId: new ObjectId('100000000000000000000002'), order: 300, title: 'Capítulo 3: A Rainha das Flores', content: '<p>Uma flor gigante falava com voz suave como o vento...</p>', wordCount: 90 },
    { _id: new ObjectId('200000000000000000000009'), bookId: new ObjectId('100000000000000000000002'), order: 400, title: 'Capítulo 4: O Segredo do Jardim', content: '<p>O jardim guardava um segredo que só Julia podia descobrir...</p>', wordCount: 105 },

    // Book 3 chapters (2)
    { _id: new ObjectId('200000000000000000000010'), bookId: new ObjectId('100000000000000000000003'), order: 100, title: 'Capítulo 1: O Ovo Misterioso', content: '<p>No sótão da vovó, Julia encontrou um ovo brilhante...</p>', wordCount: 80 },
    { _id: new ObjectId('200000000000000000000011'), bookId: new ObjectId('100000000000000000000003'), order: 200, title: 'Capítulo 2: O Bebê Dragão', content: '<p>De dentro do ovo saiu um dragãozinho cor de fogo...</p>', wordCount: 70 },
  ],

  assets: [
    {
      _id: new ObjectId('300000000000000000000001'),
      bookId: new ObjectId('100000000000000000000001'),
      authorId: new ObjectId('000000000000000000000001'),
      url: 'https://minio.contopia.local/books/100000000000000000000001/cover.jpg',
      type: 'cover',
      mimeType: 'image/jpeg',
      sizeBytes: 245760,
    },
  ],

  readingProgress: [
    {
      _id: new ObjectId('400000000000000000000001'),
      userId: new ObjectId('000000000000000000000001'),
      bookId: new ObjectId('100000000000000000000001'),
      lastChapterId: new ObjectId('200000000000000000000003'),
      lastPosition: 42,
      percentage: 60,
    },
  ],

  activityLogs: [
    {
      _id: new ObjectId('500000000000000000000001'),
      actorId: new ObjectId('000000000000000000000001'),
      actorType: 'child',
      action: 'book.create',
      targetId: new ObjectId('100000000000000000000001'),
      targetType: 'book',
      metadata: { title: 'A Aventura no Espaço', status: 'draft' },
      createdAt: new Date('2026-04-15'),
    },
    {
      _id: new ObjectId('500000000000000000000002'),
      actorId: new ObjectId('000000000000000000000001'),
      actorType: 'child',
      action: 'book.publish',
      targetId: new ObjectId('100000000000000000000001'),
      targetType: 'book',
      metadata: { title: 'A Aventura no Espaço' },
      createdAt: new Date('2026-05-01'),
    },
    {
      _id: new ObjectId('500000000000000000000003'),
      actorId: new ObjectId('000000000000000000000001'),
      actorType: 'child',
      action: 'book.create',
      targetId: new ObjectId('100000000000000000000002'),
      targetType: 'book',
      metadata: { title: 'O Jardim Secreto', status: 'draft' },
      createdAt: new Date('2026-05-02'),
    },
  ],
};

// ── up() ──────────────────────────────────────────────────────────────────────
async function up(db) {
  if (process.env.NODE_ENV === 'production') {
    console.log('  ⧖ Skipping seed — NODE_ENV is production.');
    return;
  }

  console.log('  Seeding dev data...');

  // Insert books (use updateOne with upsert for idempotency)
  for (const book of SEED.books) {
    await db.collection('books').updateOne(
      { _id: book._id },
      {
        $setOnInsert: {
          ...book,
          authorId: SEED.authorId,
          chapterIds: SEED.chapters
            .filter((c) => c.bookId.equals(book._id))
            .map((c) => c._id),
          coverAssetId: SEED.assets.find((a) => a.bookId.equals(book._id))?._id || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`    ✓ ${SEED.books.length} books seeded`);

  // Insert chapters
  for (const ch of SEED.chapters) {
    await db.collection('chapters').updateOne(
      { _id: ch._id },
      {
        $setOnInsert: {
          ...ch,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`    ✓ ${SEED.chapters.length} chapters seeded`);

  // Insert assets
  for (const asset of SEED.assets) {
    await db.collection('assets').updateOne(
      { _id: asset._id },
      {
        $setOnInsert: {
          ...asset,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`    ✓ ${SEED.assets.length} assets seeded`);

  // Insert reading progress
  for (const rp of SEED.readingProgress) {
    await db.collection('reading_progress').updateOne(
      { _id: rp._id },
      {
        $setOnInsert: {
          ...rp,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`    ✓ ${SEED.readingProgress.length} reading progress entries seeded`);

  // Insert activity logs (append-only, so only insert if not exists)
  for (const log of SEED.activityLogs) {
    await db.collection('activity_logs').updateOne(
      { _id: log._id },
      { $setOnInsert: log },
      { upsert: true }
    );
  }
  console.log(`    ✓ ${SEED.activityLogs.length} activity logs seeded`);

  // Validate counts
  console.log('  Validation:');
  console.log(`    books:             ${await db.collection('books').countDocuments()}`);
  console.log(`    chapters:          ${await db.collection('chapters').countDocuments()}`);
  console.log(`    assets:            ${await db.collection('assets').countDocuments()}`);
  console.log(`    reading_progress:  ${await db.collection('reading_progress').countDocuments()}`);
  console.log(`    activity_logs:     ${await db.collection('activity_logs').countDocuments()}`);

  console.log('\n  002-seed-dev UP complete.\n');
}

// ── down() ────────────────────────────────────────────────────────────────────
async function down(db) {
  const seededBookIds = SEED.books.map((b) => b._id);
  const seededChapterIds = SEED.chapters.map((c) => c._id);
  const seededAssetIds = SEED.assets.map((a) => a._id);
  const seededProgressIds = SEED.readingProgress.map((rp) => rp._id);
  const seededLogIds = SEED.activityLogs.map((l) => l._id);

  await db.collection('activity_logs').deleteMany({ _id: { $in: seededLogIds } });
  console.log(`  ✓ Removed ${SEED.activityLogs.length} seeded activity logs`);

  await db.collection('reading_progress').deleteMany({ _id: { $in: seededProgressIds } });
  console.log(`  ✓ Removed ${SEED.readingProgress.length} seeded reading progress entries`);

  await db.collection('assets').deleteMany({ _id: { $in: seededAssetIds } });
  console.log(`  ✓ Removed ${SEED.assets.length} seeded assets`);

  await db.collection('chapters').deleteMany({ _id: { $in: seededChapterIds } });
  console.log(`  ✓ Removed ${SEED.chapters.length} seeded chapters`);

  await db.collection('books').deleteMany({ _id: { $in: seededBookIds } });
  console.log(`  ✓ Removed ${SEED.books.length} seeded books`);

  console.log('\n  002-seed-dev DOWN complete.\n');
}

module.exports = { up, down };
