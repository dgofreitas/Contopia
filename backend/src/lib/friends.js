const FamilyLink = require('../models/family-link');
const Parent = require('../models/parent');
const Child = require('../models/child');

// Famílias amigas (convite aceito) de um responsável.
async function friendParentIds(parentId) {
  const links = await FamilyLink.find({ status: 'accepted', $or: [{ from: parentId }, { to: parentId }] });
  return links.map((link) => (String(link.from) === String(parentId) ? link.to : link.from));
}

async function areFriends(a, b) {
  return Boolean(await FamilyLink.exists({ status: 'accepted', $or: [{ from: a, to: b }, { from: b, to: a }] }));
}

// Responsáveis e crianças das famílias amigas: para quem uma criança pode mandar livros.
async function friendChildren(parentId) {
  const parentIds = await friendParentIds(parentId);
  const [parents, children] = await Promise.all([
    Parent.find({ _id: { $in: parentIds } }),
    Child.find({ parentId: { $in: parentIds } }).sort({ createdAt: 1 }),
  ]);
  return { parents, children };
}

module.exports = { friendParentIds, areFriends, friendChildren };
