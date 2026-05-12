#!/usr/bin/env node
// Contopia — Dev Seed Script
// Populates MongoDB with sample books, chapters, assets, reading progress, and activity logs.
// Usage: node scripts/seed-dev.js
// Requires: MONGODB_URI env var (defaults to mongodb://localhost:27017/estantedigital)
import mongoose from 'mongoose';
import pino from 'pino';
import { Book, Chapter, Asset, ReadingProgress, ActivityLog } from '../src/app/book/book-model.js';
import { Parent, Child } from '../src/app/auth/auth-model.js';

const logger = pino({ name: 'seed-dev', level: process.env.LOG_LEVEL || 'info' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/estantedigital';

const SAMPLE_BOOKS = [
  { title: 'A Aventura da Floresta Mágica', description: 'Uma história sobre amizade e coragem na floresta encantada.', status: 'published' },
  { title: 'O Mistério da Lua Cheia', description: 'Um mistério para resolver antes do amanhecer.', status: 'published' },
  { title: 'Viagem ao Centro do Mar', description: 'Uma aventura submarina inesquecível.', status: 'published' },
  { title: 'O Dragão da Montanha', description: 'Um dragão gentil precisa de amigos.', status: 'draft' },
  { title: 'Estrelas Cadentes', description: 'Histórias que brilham no céu noturno.', status: 'draft' },
];

const SAMPLE_CHAPTERS = [
  { order: 100, title: 'O Início da Jornada', content: 'Era uma vez, em uma pequena vila...' },
  { order: 200, title: 'Encontrando o Caminho', content: 'O caminho não era fácil, mas...' },
  { order: 300, title: 'A Grande Descoberta', content: 'No coração da floresta, encontraram...' },
];

async function seed() {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  logger.info('Connected. Cleaning existing seed data...');

  // Clean in dependency order
  await ActivityLog.deleteMany({}).exec();
  await ReadingProgress.deleteMany({}).exec();
  await Asset.deleteMany({}).exec();
  await Chapter.deleteMany({}).exec();
  await Book.deleteMany({}).exec();

  // Find or create a parent
  let parent = await Parent.findOne({ isVerified: true }).exec();
  if (!parent) {
    parent = await Parent.create({ email: 'seeder@contopia.dev', isVerified: true });
    logger.info({ parentId: parent._id }, 'Created seed parent');
  }

  // Find or create a child
  let child = await Child.findOne({ parentId: parent._id, isActive: true }).exec();
  if (!child) {
    child = await Child.create({ parentId: parent._id, firstName: 'Julia', isActive: true, onboardingCompleted: true });
    logger.info({ childId: child._id }, 'Created seed child');
  }

  const authorId = child._id;

  // ── Create books ──────────────────────────────────────────────────────────────
  const books = [];
  for (const bookData of SAMPLE_BOOKS) {
    const book = await Book.create({
      authorId,
      title: bookData.title,
      description: bookData.description,
      status: bookData.status,
      language: 'pt-BR',
      publishedAt: bookData.status === 'published' ? new Date() : null,
    });
    books.push(book);
    logger.info({ bookId: book._id, title: book.title }, 'Created seed book');
  }

  // ── Create chapters ──────────────────────────────────────────────────────────
  for (const book of books) {
    const chapterIds = [];
    for (const chapData of SAMPLE_CHAPTERS) {
      const chapter = await Chapter.create({
        bookId: book._id,
        order: chapData.order,
        title: chapData.title,
        content: chapData.content,
        wordCount: chapData.content.split(/\s+/).length,
      });
      chapterIds.push(chapter._id);
      logger.info({ chapterId: chapter._id, bookId: book._id }, 'Created seed chapter');
    }
    // Sync chapterIds on book
    await Book.findByIdAndUpdate(book._id, { chapterIds }).exec();
  }

  // ── Create assets (cover per book) ──────────────────────────────────────────
  for (const book of books) {
    const asset = await Asset.create({
      bookId: book._id,
      authorId,
      url: `/covers/${book._id}.webp`,
      type: 'cover',
      mimeType: 'image/webp',
      sizeBytes: 150_000 + Math.floor(Math.random() * 100_000),
    });
    // Set coverAssetId on book
    await Book.findByIdAndUpdate(book._id, { coverAssetId: asset._id }).exec();
    logger.info({ assetId: asset._id, bookId: book._id }, 'Created seed asset');
  }

  // ── Create reading progress (for published books) ──────────────────────────
  const publishedBooks = books.filter((b) => b.status === 'published');
  for (const book of publishedBooks) {
    const chapters = await Chapter.find({ bookId: book._id }).sort({ order: 1 }).exec();
    const lastChapter = chapters[chapters.length - 1];
    const progress = await ReadingProgress.create({
      userId: authorId,
      bookId: book._id,
      lastChapterId: lastChapter?._id || null,
      lastPosition: Math.floor(Math.random() * 1000),
      percentage: Math.floor(Math.random() * 80) + 20,
    });
    logger.info({ progressId: progress._id, bookId: book._id }, 'Created seed reading progress');
  }

  // ── Create activity logs ─────────────────────────────────────────────────────
  for (const book of books) {
    await ActivityLog.create({
      actorId: authorId,
      actorType: 'child',
      action: 'book.create',
      targetId: book._id,
      targetType: 'book',
    });
  }
  for (const book of publishedBooks) {
    await ActivityLog.create({
      actorId: authorId,
      actorType: 'child',
      action: 'book.publish',
      targetId: book._id,
      targetType: 'book',
    });
  }

  logger.info('Seed complete. Summary:');
  logger.info(`  Books: ${books.length}`);
  logger.info(`  Chapters per book: ${SAMPLE_CHAPTERS.length}`);
  logger.info(`  Assets per book: 1 (cover)`);
  logger.info(`  Reading progress entries: ${publishedBooks.length}`);
  logger.info(`  Activity log entries: ${books.length + publishedBooks.length}`);

  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}

seed().catch((err) => {
  logger.fatal({ err }, 'Seed failed');
  process.exit(1);
});