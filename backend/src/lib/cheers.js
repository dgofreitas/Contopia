const Reaction = require('../models/reaction');
const MoreWish = require('../models/more-wish');
const Comment = require('../models/comment');
const Child = require('../models/child');
const { REACTIONS } = require('./constants');

// Pedido de capítulo ainda não atendido: o livro não ganhou capítulo desde o pedido.
const activeWish = (book) => ({ bookId: book._id, chapters: { $gte: book.chapters.length } });

const unseenByBook = (Model, ids) => Model.aggregate([{ $match: { bookId: { $in: ids }, seen: false } }, { $group: { _id: '$bookId', count: { $sum: 1 } } }]);

// Figurinhas e recados novos e pedidos de capítulo de cada livro, para a estante do autor.
async function cheersByBook(books) {
  const ids = books.map((b) => b._id);
  const [reactions, comments, wishes] = await Promise.all([unseenByBook(Reaction, ids), unseenByBook(Comment, ids), MoreWish.find({ bookId: { $in: ids } }, 'bookId chapters')]);
  const fresh = Object.fromEntries(reactions.map((r) => [String(r._id), r.count]));
  const freshComments = Object.fromEntries(comments.map((r) => [String(r._id), r.count]));
  const chaptersOf = Object.fromEntries(books.map((b) => [String(b._id), b.chapters.length]));
  const wanting = {};
  for (const wish of wishes) {
    const id = String(wish.bookId);
    if (wish.chapters >= chaptersOf[id]) wanting[id] = (wanting[id] || 0) + 1;
  }
  return Object.fromEntries(
    books.map((b) => {
      const id = String(b._id);
      return [id, { new: fresh[id] || 0, newComments: freshComments[id] || 0, wantMore: wanting[id] || 0 }];
    }),
  );
}

const countsOf = (reactions) =>
  REACTIONS.map((emoji) => ({ emoji, count: reactions.filter((r) => r.emoji === emoji).length })).filter((r) => r.count > 0);

const person = (child) => ({ id: String(child._id), nickname: child.nickname, avatar: child.avatar });

// Recados do livro, do mais antigo ao mais novo, com quem escreveu. viewerId diz
// quais são do próprio leitor; o autor do livro pode apagar todos.
async function commentsOf(book, viewerId, isOwner) {
  const comments = await Comment.find({ bookId: book._id }).sort({ createdAt: 1 });
  const writers = await Child.find({ _id: { $in: comments.map((c) => c.childId) } });
  const byId = Object.fromEntries(writers.map((c) => [String(c._id), c]));
  return comments
    .filter((c) => byId[String(c.childId)])
    .map((c) => {
      const mine = String(c.childId) === String(viewerId);
      return { id: String(c._id), text: c.text, by: person(byId[String(c.childId)]), mine, canDelete: mine || isOwner, at: c.createdAt, ...(isOwner && { new: !c.seen }) };
    });
}

// O que o autor vê: quantas de cada figurinha, quem deu e quem quer o próximo capítulo.
async function ownerCheers(book, author) {
  const [reactions, wishes] = await Promise.all([
    Reaction.find({ bookId: book._id }).sort({ createdAt: 1 }),
    MoreWish.find(activeWish(book)).sort({ createdAt: 1 }),
  ]);
  const readers = await Child.find({ _id: { $in: [...reactions.map((r) => r.childId), ...wishes.map((w) => w.childId)] } });
  const byId = Object.fromEntries(readers.map((c) => [String(c._id), c]));
  const fans = [];
  for (const reaction of reactions) {
    const child = byId[String(reaction.childId)];
    if (!child) continue;
    let fan = fans.find((f) => f.id === String(child._id));
    if (!fan) fans.push((fan = { ...person(child), emojis: [] }));
    fan.emojis.push(reaction.emoji);
  }
  return {
    enabled: !author.cheersOff,
    reactions: countsOf(reactions).map((r) => ({ ...r, new: reactions.filter((x) => x.emoji === r.emoji && !x.seen).length })),
    fans,
    wantMore: wishes.map((w) => byId[String(w.childId)]).filter(Boolean).map(person),
    comments: await commentsOf(book, author._id, true),
  };
}

// O que um leitor vê: o total de cada figurinha (sem nomes), as que ele deu e se já pediu mais.
async function readerCheers(book, author, reader) {
  const [reactions, wish] = await Promise.all([
    Reaction.find({ bookId: book._id }, 'emoji childId'),
    MoreWish.findOne({ ...activeWish(book), childId: reader._id }),
  ]);
  return {
    enabled: !author.cheersOff && !reader.cheersOff,
    reactions: countsOf(reactions),
    mine: reactions.filter((r) => String(r.childId) === String(reader._id)).map((r) => r.emoji),
    canWantMore: book.chaptered,
    wantsMore: Boolean(wish),
    comments: await commentsOf(book, reader._id, false),
  };
}

async function removeCheersOfBooks(bookIds) {
  await Promise.all([Reaction.deleteMany({ bookId: { $in: bookIds } }), MoreWish.deleteMany({ bookId: { $in: bookIds } }), Comment.deleteMany({ bookId: { $in: bookIds } })]);
}

async function removeCheersBy(childId) {
  await Promise.all([Reaction.deleteMany({ childId }), MoreWish.deleteMany({ childId }), Comment.deleteMany({ childId })]);
}

module.exports = { cheersByBook, ownerCheers, readerCheers, removeCheersOfBooks, removeCheersBy, activeWish };
