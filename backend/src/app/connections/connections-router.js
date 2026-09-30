const express = require('express');
const { z } = require('zod');
const Parent = require('../../models/parent');
const Child = require('../../models/child');
const Book = require('../../models/book');
const FamilyLink = require('../../models/family-link');
const FriendGroup = require('../../models/friend-group');
const { wrap, parse, notFound, badRequest, conflict } = require('../../lib/errors');
const { requireParent } = require('../../lib/guards');

const idParam = z.string().regex(/^[a-f0-9]{24}$/);

// Famílias amigas, administradas pelos responsáveis. Uma família acha a outra
// pelo nome público (@freitas); o convite só vale depois que o outro lado aceita.
function createConnectionsRouter() {
  const router = express.Router();
  router.use(requireParent);

  const findMine = async (req) => {
    const id = parse(idParam, req.params.id);
    const link = await FamilyLink.findOne({ _id: id, $or: [{ from: req.session.parentId }, { to: req.session.parentId }] });
    if (!link) throw notFound('LINK_NOT_FOUND');
    return link;
  };

  router.get(
    '/',
    wrap(async (req, res) => {
      const me = req.session.parentId;
      const links = await FamilyLink.find({ $or: [{ from: me }, { to: me }] }).sort({ createdAt: 1 });
      const otherId = (link) => (String(link.from) === me ? link.to : link.from);
      const parents = await Parent.find({ _id: { $in: links.map(otherId) } });
      const nameOf = Object.fromEntries(parents.map((p) => [String(p._id), p.familyName || null]));
      const item = (link) => ({ id: String(link._id), familyName: nameOf[String(otherId(link))] ?? null });
      res.json({
        friends: links.filter((l) => l.status === 'accepted').map(item),
        incoming: links.filter((l) => l.status === 'pending' && String(l.to) === me).map(item),
        outgoing: links.filter((l) => l.status === 'pending' && String(l.from) === me).map(item),
      });
    }),
  );

  // Convida outra família pelo nome. Se ela já tinha convidado, vira amizade na hora.
  router.post(
    '/',
    wrap(async (req, res) => {
      const body = parse(z.object({ name: z.string().trim().toLowerCase().min(1).max(31) }), req.body);
      const name = body.name.replace(/^@/, '');
      const me = await Parent.findById(req.session.parentId);
      // Quem recebe o convite precisa saber quem está chamando.
      if (!me.familyName) throw badRequest('FAMILY_NAME_REQUIRED');
      const other = await Parent.findOne({ familyName: name });
      if (!other) throw notFound('FAMILY_NAME_NOT_FOUND');
      if (String(other._id) === String(me._id)) throw badRequest('SELF_LINK');

      const theirs = await FamilyLink.findOne({ from: other._id, to: me._id });
      if (theirs?.status === 'pending') {
        theirs.status = 'accepted';
        await theirs.save();
        return res.status(201).json({ link: { id: String(theirs._id), familyName: other.familyName, status: 'accepted' } });
      }
      if (theirs || (await FamilyLink.exists({ from: me._id, to: other._id }))) throw conflict('ALREADY_LINKED');

      const link = await FamilyLink.create({ from: me._id, to: other._id });
      res.status(201).json({ link: { id: String(link._id), familyName: other.familyName, status: 'pending' } });
    }),
  );

  router.post(
    '/:id/accept',
    wrap(async (req, res) => {
      const link = await findMine(req);
      if (String(link.to) !== req.session.parentId || link.status !== 'pending') throw badRequest('CANNOT_ACCEPT');
      link.status = 'accepted';
      await link.save();
      res.json({ ok: true });
    }),
  );

  // Recusa, cancela ou desfaz a amizade. Os livros que uma família tinha mandado
  // para as crianças da outra deixam de ser compartilhados com elas; livro que
  // fica sem ninguém para ler volta a ser só de quem escreveu.
  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const link = await findMine(req);
      await link.deleteOne();
      const [a, b] = await Promise.all([Child.find({ parentId: link.from }, '_id'), Child.find({ parentId: link.to }, '_id')]);
      const ids = (list) => list.map((c) => c._id);
      await Book.updateMany({ childId: { $in: ids(a) } }, { $pull: { sharedWith: { $in: ids(b) } } });
      await Book.updateMany({ childId: { $in: ids(b) } }, { $pull: { sharedWith: { $in: ids(a) } } });
      await FriendGroup.updateMany({ childId: { $in: ids(a) } }, { $pull: { members: { $in: ids(b) } } });
      await FriendGroup.updateMany({ childId: { $in: ids(b) } }, { $pull: { members: { $in: ids(a) } } });
      await Book.updateMany(
        { childId: { $in: [...ids(a), ...ids(b)] }, visibility: 'people', sharedWith: { $size: 0 }, sharedGroups: { $size: 0 } },
        { $set: { visibility: 'private' } },
      );
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { createConnectionsRouter };
