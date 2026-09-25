const express = require('express');
const { z } = require('zod');
const Book = require('../../models/book');
const { COVER_COLORS } = require('../../lib/constants');
const { wrap, parse, notFound } = require('../../lib/errors');
const { requireChild } = require('../../lib/guards');
const { sanitizeChapterHtml } = require('../../lib/sanitize');

const MAX_CHAPTERS = 60;
const MAX_CHAPTER_HTML = 200_000;
const idParam = z.string().regex(/^[a-f0-9]{24}$/);

const coverSchema = z.object({
  color: z.enum(COVER_COLORS),
  sticker: z.string().max(8).default(''),
});

const chapterSchema = z.object({
  title: z.string().max(120).default(''),
  html: z.string().max(MAX_CHAPTER_HTML).default(''),
});

function summary(book) {
  return {
    id: String(book._id),
    title: book.title,
    kind: book.kind,
    cover: { color: book.cover.color, sticker: book.cover.sticker },
    favorite: book.favorite,
    visibility: book.visibility,
    chapters: book.chapters.length,
    progress: book.progress?.updatedAt ? { chapter: book.progress.chapter, page: book.progress.page, updatedAt: book.progress.updatedAt } : null,
    updatedAt: book.updatedAt,
  };
}

function full(book) {
  return { ...summary(book), chapters: book.chapters.map((c) => ({ title: c.title, html: c.html })) };
}

// Livros da criança ativa. Cada consulta filtra por childId, então uma criança
// nunca enxerga nem altera o livro de outra.
function createBooksRouter() {
  const router = express.Router();
  router.use(requireChild);

  const findOwn = async (req) => {
    const id = parse(idParam, req.params.id);
    const book = await Book.findOne({ _id: id, childId: req.session.childId });
    if (!book) throw notFound('BOOK_NOT_FOUND');
    return book;
  };

  router.get(
    '/',
    wrap(async (req, res) => {
      const books = await Book.find({ childId: req.session.childId }).sort({ createdAt: 1 });
      res.json({ books: books.map(summary) });
    }),
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const body = parse(z.object({ title: z.string().trim().min(1).max(80), cover: coverSchema }), req.body);
      const book = await Book.create({ childId: req.session.childId, title: body.title, cover: body.cover });
      res.status(201).json({ book: full(book) });
    }),
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      res.json({ book: full(await findOwn(req)) });
    }),
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const book = await findOwn(req);
      const body = parse(
        z.object({
          title: z.string().trim().min(1).max(80).optional(),
          cover: coverSchema.optional(),
          favorite: z.boolean().optional(),
          chapters: z.array(chapterSchema).min(1).max(MAX_CHAPTERS).optional(),
        }),
        req.body,
      );
      if (body.title !== undefined) book.title = body.title;
      if (body.cover) book.cover = body.cover;
      if (body.favorite !== undefined) book.favorite = body.favorite;
      if (body.chapters) {
        book.chapters = body.chapters.map((c) => ({ title: c.title, html: sanitizeChapterHtml(c.html) }));
        const last = book.chapters.length - 1;
        if (book.progress.chapter > last) book.progress.chapter = last;
      }
      await book.save();
      res.json({ book: full(book) });
    }),
  );

  router.put(
    '/:id/progress',
    wrap(async (req, res) => {
      const book = await findOwn(req);
      const body = parse(z.object({ chapter: z.number().int().min(0), page: z.number().int().min(0) }), req.body);
      book.progress = {
        chapter: Math.min(body.chapter, book.chapters.length - 1),
        page: body.page,
        updatedAt: new Date(),
      };
      await book.save();
      res.json({ progress: book.progress });
    }),
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const book = await findOwn(req);
      await book.deleteOne();
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { createBooksRouter };
