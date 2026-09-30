const FamilyLink = require('../models/family-link');

// Famílias amigas (convite aceito) de um responsável.
async function friendParentIds(parentId) {
  const links = await FamilyLink.find({ status: 'accepted', $or: [{ from: parentId }, { to: parentId }] });
  return links.map((link) => (String(link.from) === String(parentId) ? link.to : link.from));
}

async function areFriends(a, b) {
  return Boolean(await FamilyLink.exists({ status: 'accepted', $or: [{ from: a, to: b }, { from: b, to: a }] }));
}

module.exports = { friendParentIds, areFriends };
