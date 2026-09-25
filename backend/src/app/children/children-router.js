const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const Child = require('../../models/child');
const Book = require('../../models/book');
const { AVATARS } = require('../../lib/constants');
const { wrap, parse, notFound, badRequest } = require('../../lib/errors');
const { requireParent } = require('../../lib/guards');
const { pictureSchema, pictureKey, publicChild, BCRYPT_COST } = require('../auth/auth-router');

const MAX_CHILDREN = 6;
const idParam = z.string().regex(/^[a-f0-9]{24}$/);

// Perfis das crianças, administrados pelo responsável.
function createChildrenRouter() {
  const router = express.Router();
  router.use(requireParent);

  router.get(
    '/',
    wrap(async (req, res) => {
      const children = await Child.find({ parentId: req.session.parentId }).sort({ createdAt: 1 });
      const counts = await Book.aggregate([
        { $match: { childId: { $in: children.map((c) => c._id) } } },
        { $group: { _id: '$childId', count: { $sum: 1 } } },
      ]);
      const byChild = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
      res.json({ children: children.map((c) => ({ ...publicChild(c), books: byChild[String(c._id)] || 0 })) });
    }),
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const body = parse(
        z.object({ nickname: z.string().trim().min(1).max(24), avatar: z.enum(AVATARS), picture: pictureSchema }),
        req.body,
      );
      if ((await Child.countDocuments({ parentId: req.session.parentId })) >= MAX_CHILDREN) {
        throw badRequest('TOO_MANY_CHILDREN');
      }
      const child = await Child.create({
        parentId: req.session.parentId,
        nickname: body.nickname,
        avatar: body.avatar,
        picturePasswordHash: await bcrypt.hash(pictureKey(body.picture), BCRYPT_COST),
      });
      res.status(201).json({ child: { ...publicChild(child), books: 0 } });
    }),
  );

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const id = parse(idParam, req.params.id);
      const body = parse(
        z.object({
          nickname: z.string().trim().min(1).max(24).optional(),
          avatar: z.enum(AVATARS).optional(),
          picture: pictureSchema.optional(),
        }),
        req.body,
      );
      const update = {};
      if (body.nickname) update.nickname = body.nickname;
      if (body.avatar) update.avatar = body.avatar;
      if (body.picture) update.picturePasswordHash = await bcrypt.hash(pictureKey(body.picture), BCRYPT_COST);
      const child = await Child.findOneAndUpdate({ _id: id, parentId: req.session.parentId }, update, { new: true });
      if (!child) throw notFound('CHILD_NOT_FOUND');
      res.json({ child: publicChild(child) });
    }),
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const id = parse(idParam, req.params.id);
      const child = await Child.findOneAndDelete({ _id: id, parentId: req.session.parentId });
      if (!child) throw notFound('CHILD_NOT_FOUND');
      await Book.deleteMany({ childId: child._id });
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { createChildrenRouter };
