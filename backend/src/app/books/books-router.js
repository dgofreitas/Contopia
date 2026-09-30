const express = require('express');
const { z } = require('zod');
const Book = require('../../models/book');
const Child = require('../../models/child');
const Parent = require('../../models/parent');
const BookImage = require('../../models/book-image');
const { IMAGE_TYPES, MAX_UPLOAD_BYTES, processImage } = require('../../lib/images');
const { COVER_COLORS } = require('../../lib/constants');
const { wrap, parse, notFound, badRequest } = require('../../lib/errors');
const { requireChild } = require('../../lib/guards');
const { friendParentIds, areFriends } = require('../../lib/friends');
const { sanitizeChapterHtml, imageIdsIn } = require('../../lib/sanitize');

const MAX_CHAPTERS = 60;
const MAX_CHAPTER_HTML = 200_000;
const MAX_IMAGES_PER_BOOK = 100;
const MAX_SHARED_WITH = 50;
// Imagem que saiu do texto só é apagada depois de um tempo, para o "desfazer"
// do editor ainda conseguir trazê-la de volta.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
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
    published: book.published,
    visibility: book.visibility,
    sharedWith: (book.sharedWith || []).map(String),
    chaptered: book.chaptered,
    chapters: book.chapters.length,
    progress: book.progress?.updatedAt ? { chapter: book.progress.chapter, page: book.progress.page, updatedAt: book.progress.updatedAt } : null,
    updatedAt: book.updatedAt,
  };
}

function full(book) {
  return { ...summary(book), mine: true, chapters: book.chapters.map((c) => ({ title: c.title, html: c.html })) };
}

// Livro de outra criança, visto por quem só pode ler: sem favorito, progresso nem
// com quem mais foi compartilhado. familyName aparece para livro de família amiga.
function shared(book, author, familyName) {
  return {
    id: String(book._id),
    title: book.title,
    cover: { color: book.cover.color, sticker: book.cover.sticker },
    chaptered: book.chaptered,
    chapters: book.chapters.length,
    author: { id: String(author._id), nickname: author.nickname, avatar: author.avatar, ...(familyName !== undefined && { familyName }) },
    updatedAt: book.updatedAt,
  };
}

// Livros da criança ativa. Cada consulta filtra por childId, então uma criança
// nunca enxerga nem altera o livro de outra.
function createBooksRouter({ images }) {
  const router = express.Router();
  router.use(requireChild);

  const findOwn = async (req) => {
    const id = parse(idParam, req.params.id);
    const book = await Book.findOne({ _id: id, childId: req.session.childId });
    if (!book) throw notFound('BOOK_NOT_FOUND');
    return book;
  };

  // Para ler: o próprio livro, o de um irmão publicado para a família, ou o de
  // uma criança de família amiga que escolheu esta criança para ler.
  // Livro que a criança não pode ler responde como se não existisse.
  const findReadable = async (req) => {
    const id = parse(idParam, req.params.id);
    const book = await Book.findById(id);
    if (book && String(book.childId) === req.session.childId) return { book, author: null };
    if (book?.published && book.visibility === 'family') {
      const author = await Child.findOne({ _id: book.childId, parentId: req.session.parentId });
      if (author) return { book, author };
    }
    if (book?.published && book.visibility === 'people' && book.sharedWith.some((c) => String(c) === req.session.childId)) {
      const author = await Child.findById(book.childId);
      if (author && (await areFriends(author.parentId, req.session.parentId))) {
        const family = await Parent.findById(author.parentId);
        return { book, author, familyName: family?.familyName || null };
      }
    }
    throw notFound('BOOK_NOT_FOUND');
  };

  // Crianças das famílias amigas: para quem esta criança pode mandar livros.
  const friendChildren = async (req) => {
    const parentIds = await friendParentIds(req.session.parentId);
    const [parents, children] = await Promise.all([
      Parent.find({ _id: { $in: parentIds } }),
      Child.find({ parentId: { $in: parentIds } }).sort({ createdAt: 1 }),
    ]);
    return { parents, children };
  };

  // Apaga as imagens que não aparecem mais em nenhum capítulo.
  const removeOrphanImages = async (book) => {
    const used = new Set(book.chapters.flatMap((c) => imageIdsIn(c.html)));
    const old = await BookImage.find({ bookId: book._id, createdAt: { $lt: new Date(Date.now() - ORPHAN_GRACE_MS) } });
    const orphans = old.filter((image) => !used.has(String(image._id)));
    await Promise.all(orphans.map((image) => images.remove(book._id, image.file)));
    if (orphans.length > 0) await BookImage.deleteMany({ _id: { $in: orphans.map((image) => image._id) } });
  };

  router.get(
    '/',
    wrap(async (req, res) => {
      const books = await Book.find({ childId: req.session.childId }).sort({ createdAt: 1 });
      res.json({ books: books.map(summary) });
    }),
  );

  // Famílias amigas e suas crianças, para escolher quem pode ler.
  router.get(
    '/friends',
    wrap(async (req, res) => {
      const { parents, children } = await friendChildren(req);
      res.json({
        families: parents
          .map((parent) => ({
            familyName: parent.familyName || null,
            children: children
              .filter((c) => String(c.parentId) === String(parent._id))
              .map((c) => ({ id: String(c._id), nickname: c.nickname, avatar: c.avatar })),
          }))
          .filter((family) => family.children.length > 0),
      });
    }),
  );

  // Livros para ler que não são da criança: os que os irmãos publicaram para a
  // família e os que crianças de famílias amigas mandaram para ela.
  router.get(
    '/family',
    wrap(async (req, res) => {
      const siblings = await Child.find({ parentId: req.session.parentId, _id: { $ne: req.session.childId } }).sort({ createdAt: 1 });
      const books = await Book.find({ childId: { $in: siblings.map((c) => c._id) }, published: true, visibility: 'family' }).sort({ updatedAt: -1 });
      const children = siblings
        .map((child) => ({
          id: String(child._id),
          nickname: child.nickname,
          avatar: child.avatar,
          books: books.filter((b) => String(b.childId) === String(child._id)).map((b) => shared(b, child)),
        }))
        .filter((child) => child.books.length > 0);

      const { parents, children: friends } = await friendChildren(req);
      const sent = await Book.find({
        childId: { $in: friends.map((c) => c._id) },
        published: true,
        visibility: 'people',
        sharedWith: req.session.childId,
      }).sort({ updatedAt: -1 });
      const nameOf = Object.fromEntries(parents.map((p) => [String(p._id), p.familyName || null]));
      const fromFriends = friends
        .map((child) => {
          const familyName = nameOf[String(child.parentId)];
          return {
            id: String(child._id),
            nickname: child.nickname,
            avatar: child.avatar,
            familyName,
            books: sent.filter((b) => String(b.childId) === String(child._id)).map((b) => shared(b, child, familyName)),
          };
        })
        .filter((child) => child.books.length > 0);
      res.json({ children, friends: fromFriends });
    }),
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const body = parse(
        z.object({ title: z.string().trim().min(1).max(80), cover: coverSchema, chaptered: z.boolean().default(false) }),
        req.body,
      );
      const book = await Book.create({
        childId: req.session.childId,
        title: body.title,
        cover: body.cover,
        chaptered: body.chaptered,
        published: false,
        chapters: [{ title: body.chaptered ? 'Capítulo 1' : '', html: '' }],
      });
      res.status(201).json({ book: full(book) });
    }),
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const { book, author, familyName } = await findReadable(req);
      res.json({ book: author ? { ...shared(book, author, familyName), mine: false, chapters: book.chapters.map((c) => ({ title: c.title, html: c.html })) } : full(book) });
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
          published: z.boolean().optional(),
          visibility: z.enum(['private', 'family', 'people']).optional(),
          sharedWith: z.array(idParam).max(MAX_SHARED_WITH).optional(),
          chaptered: z.boolean().optional(),
          chapters: z.array(chapterSchema).min(1).max(MAX_CHAPTERS).optional(),
        }),
        req.body,
      );
      if (body.title !== undefined) book.title = body.title;
      if (body.cover) book.cover = body.cover;
      if (body.favorite !== undefined) book.favorite = body.favorite;
      if (body.published !== undefined) book.published = body.published;
      if (body.visibility) book.visibility = body.visibility;
      if (body.sharedWith) {
        // Só crianças de famílias amigas.
        const { children } = await friendChildren(req);
        const allowed = new Set(children.map((c) => String(c._id)));
        if (!body.sharedWith.every((id) => allowed.has(id))) throw badRequest('INVALID_SHARE');
        book.sharedWith = [...new Set(body.sharedWith)];
      }
      // Só confere quando a criança está escolhendo quem lê, para o autosave nunca travar.
      if ((body.visibility || body.sharedWith) && book.visibility === 'people' && book.sharedWith.length === 0) throw badRequest('SHARE_NOBODY');
      if (body.chaptered !== undefined) book.chaptered = body.chaptered;
      // Livro sem capítulos guarda o texto todo num capítulo só.
      if (!book.chaptered && (body.chapters || book.chapters).length > 1) throw badRequest('CHAPTERLESS_SINGLE_TEXT');
      if (body.chapters) {
        book.chapters = body.chapters.map((c) => ({ title: c.title, html: sanitizeChapterHtml(c.html, { bookId: book._id }) }));
        const last = book.chapters.length - 1;
        if (book.progress.chapter > last) book.progress.chapter = last;
      }
      if (!book.chaptered) book.chapters[0].title = '';
      await book.save();
      if (body.chapters) await removeOrphanImages(book);
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

  // Imagem para o texto do livro. O corpo é o próprio arquivo (image/png etc.).
  router.post(
    '/:id/images',
    express.raw({ type: IMAGE_TYPES, limit: MAX_UPLOAD_BYTES }),
    wrap(async (req, res) => {
      const book = await findOwn(req);
      if (!req.is(IMAGE_TYPES)) throw badRequest('IMAGE_TYPE');
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw badRequest('IMAGE_INVALID');
      if ((await BookImage.countDocuments({ bookId: book._id })) >= MAX_IMAGES_PER_BOOK) throw badRequest('TOO_MANY_IMAGES');

      const { data, width, height } = await processImage(req.body);
      const file = await images.save(book._id, data);
      const image = await BookImage.create({ bookId: book._id, childId: book.childId, file, width, height, bytes: data.length });
      res.status(201).json({ image: { id: String(image._id), url: `/api/v1/books/${book._id}/images/${image._id}`, width, height } });
    }),
  );

  // Só quem pode abrir o livro vê as imagens dele.
  router.get(
    '/:id/images/:imageId',
    wrap(async (req, res) => {
      const { book } = await findReadable(req);
      const imageId = parse(idParam, req.params.imageId);
      const image = await BookImage.findOne({ _id: imageId, bookId: book._id });
      if (!image) throw notFound('IMAGE_NOT_FOUND');
      res.set('Cache-Control', 'private, max-age=31536000, immutable');
      res.type('image/webp');
      res.sendFile(images.pathOf(book._id, image.file), (err) => {
        if (err && !res.headersSent) res.status(404).json({ error: { code: 'IMAGE_NOT_FOUND' } });
      });
    }),
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const book = await findOwn(req);
      await book.deleteOne();
      await BookImage.deleteMany({ bookId: book._id });
      await images.removeBook(book._id);
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { createBooksRouter };
