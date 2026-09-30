const express = require('express');
const { z } = require('zod');
const Book = require('../../models/book');
const FriendGroup = require('../../models/friend-group');
const { wrap, parse, notFound, badRequest } = require('../../lib/errors');
const { requireChild } = require('../../lib/guards');
const { friendChildren } = require('../../lib/friends');

const MAX_GROUPS = 20;
const MAX_MEMBERS = 50;
const idParam = z.string().regex(/^[a-f0-9]{24}$/);

const groupSchema = z.object({
  name: z.string().trim().min(1).max(40),
  members: z.array(idParam).max(MAX_MEMBERS),
});

// Tira o grupo dos livros; livro que fica sem ninguém para ler volta a ser só de quem escreveu.
async function unshareGroup(groupId) {
  const ids = (await Book.find({ sharedGroups: groupId }, '_id')).map((b) => b._id);
  await Book.updateMany({ _id: { $in: ids } }, { $pull: { sharedGroups: groupId } });
  await Book.updateMany({ _id: { $in: ids }, visibility: 'people', sharedWith: { $size: 0 }, sharedGroups: { $size: 0 } }, { $set: { visibility: 'private' } });
}

// Grupos de amigos da criança ativa. Só entram crianças de famílias amigas.
function createGroupsRouter() {
  const router = express.Router();
  router.use(requireChild);

  const findOwn = async (req) => {
    const id = parse(idParam, req.params.id);
    const group = await FriendGroup.findOne({ _id: id, childId: req.session.childId });
    if (!group) throw notFound('GROUP_NOT_FOUND');
    return group;
  };

  const checkMembers = async (req, members) => {
    const { children } = await friendChildren(req.session.parentId);
    const allowed = new Set(children.map((c) => String(c._id)));
    if (!members.every((id) => allowed.has(id))) throw badRequest('INVALID_SHARE');
    return [...new Set(members)];
  };

  // Membros vêm com nome e avatar; quem deixou de ser amigo não aparece.
  const view = async (req, groups) => {
    const { parents, children } = await friendChildren(req.session.parentId);
    const nameOf = Object.fromEntries(parents.map((p) => [String(p._id), p.familyName || null]));
    const byId = Object.fromEntries(children.map((c) => [String(c._id), c]));
    const counts = await Book.aggregate([
      { $match: { childId: groups[0]?.childId ?? null, sharedGroups: { $in: groups.map((g) => g._id) } } },
      { $unwind: '$sharedGroups' },
      { $group: { _id: '$sharedGroups', count: { $sum: 1 } } },
    ]);
    const booksOf = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    return groups.map((group) => ({
      id: String(group._id),
      name: group.name,
      members: group.members
        .map((id) => byId[String(id)])
        .filter(Boolean)
        .map((c) => ({ id: String(c._id), nickname: c.nickname, avatar: c.avatar, familyName: nameOf[String(c.parentId)] })),
      books: booksOf[String(group._id)] || 0,
    }));
  };

  router.get(
    '/',
    wrap(async (req, res) => {
      const groups = await FriendGroup.find({ childId: req.session.childId }).sort({ createdAt: 1 });
      res.json({ groups: await view(req, groups) });
    }),
  );

  router.post(
    '/',
    wrap(async (req, res) => {
      const body = parse(groupSchema, req.body);
      if ((await FriendGroup.countDocuments({ childId: req.session.childId })) >= MAX_GROUPS) throw badRequest('TOO_MANY_GROUPS');
      const group = await FriendGroup.create({ childId: req.session.childId, name: body.name, members: await checkMembers(req, body.members) });
      res.status(201).json({ group: (await view(req, [group]))[0] });
    }),
  );

  // Trocar os membros vale na hora para todos os livros mandados para o grupo.
  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const group = await findOwn(req);
      const body = parse(groupSchema.partial(), req.body);
      if (body.name !== undefined) group.name = body.name;
      if (body.members) group.members = await checkMembers(req, body.members);
      await group.save();
      res.json({ group: (await view(req, [group]))[0] });
    }),
  );

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const group = await findOwn(req);
      await group.deleteOne();
      await unshareGroup(group._id);
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { createGroupsRouter };
