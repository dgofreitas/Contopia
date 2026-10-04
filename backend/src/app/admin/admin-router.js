const fs = require('fs');
const express = require('express');
const Parent = require('../../models/parent');
const Child = require('../../models/child');
const Book = require('../../models/book');
const BookImage = require('../../models/book-image');
const BookRead = require('../../models/book-read');
const FamilyLink = require('../../models/family-link');
const FriendGroup = require('../../models/friend-group');
const DailyActive = require('../../models/daily-active');
const DailyStat = require('../../models/daily-stat');
const { THEMES } = require('../../lib/constants');
const { wrap } = require('../../lib/errors');
const { requireAdmin } = require('../../lib/guards');
const { TIME_ZONE, dayOf, addDays, weekOf } = require('../../lib/stats');
const { version } = require('../../../package.json');

const WEEKS = 26;
const DAYS = 60;
// Rascunho parado há tanto tempo conta como abandonado.
const STALE_DRAFT_DAYS = 14;
const WORD_BUCKETS = [
  { label: 'Até 50', max: 50 },
  { label: '51 a 200', max: 200 },
  { label: '201 a 500', max: 500 },
  { label: '501 a 1.000', max: 1000 },
  { label: 'Mais de 1.000', max: Infinity },
];

function daysEnding(today, n) {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

function weeksEnding(today, n) {
  const last = weekOf(today);
  return Array.from({ length: n }, (_, i) => addDays(last, (i - n + 1) * 7));
}

function wordsIn(html) {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, '');
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

// Quantos documentos foram criados em cada semana (segunda a domingo, horário de Brasília).
async function newPerWeek(Model, weeks, match = {}) {
  const since = new Date(`${weeks[0]}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 1);
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: TIME_ZONE } }, n: { $sum: 1 } } },
  ]);
  const perWeek = Object.fromEntries(weeks.map((w) => [w, 0]));
  for (const row of rows) {
    const week = weekOf(row._id);
    if (week in perWeek) perWeek[week] += row.n;
  }
  return weeks.map((w) => perWeek[w]);
}

function countBy(values, keys) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const value of values) if (value in counts) counts[value] += 1;
  return counts;
}

async function diskOf(dir) {
  try {
    const s = await fs.promises.statfs(dir);
    return { free: s.bavail * s.bsize, total: s.blocks * s.bsize };
  } catch {
    return null;
  }
}

/**
 * Painel do admin: só números somados. Nenhuma resposta traz o texto de um livro,
 * o nome de uma criança ou o e-mail de uma família.
 */
function createAdminRouter({ mongoose, redis, adminEmails, uploadsDir }) {
  const router = express.Router();
  router.use(requireAdmin(adminEmails));

  router.get(
    '/metrics',
    wrap(async (req, res) => {
      const today = dayOf();
      const days = daysEnding(today, DAYS);
      const weeks = weeksEnding(today, WEEKS);
      const staleBefore = new Date(Date.now() - STALE_DRAFT_DAYS * 24 * 60 * 60 * 1000);

      const [
        families,
        children,
        books,
        imageTotals,
        reads,
        links,
        groups,
        actives,
        dailyStats,
        topReadRows,
        growthFamilies,
        growthChildren,
        growthBooks,
        growthReads,
        disk,
      ] = await Promise.all([
        Parent.countDocuments(),
        Child.find({}, { theme: 1, picturePasswordHash: 1, textPasswordHash: 1 }).lean(),
        Book.find({}, { published: 1, visibility: 1, chaptered: 1, favorite: 1, 'chapters.html': 1, 'progress.updatedAt': 1, updatedAt: 1 }).lean(),
        BookImage.aggregate([{ $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$bytes' }, books: { $addToSet: '$bookId' } } }]),
        BookRead.countDocuments(),
        FamilyLink.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        FriendGroup.countDocuments(),
        DailyActive.find({ day: { $gte: days[0] } }, { _id: 0, day: 1, who: 1, personId: 1, device: 1 }).lean(),
        DailyStat.find({ day: { $gte: days[0] } }, { _id: 0 }).lean(),
        BookRead.aggregate([
          { $group: { _id: '$bookId', reads: { $sum: 1 } } },
          { $sort: { reads: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          { $project: { _id: 0, title: '$book.title', reads: 1 } },
        ]),
        newPerWeek(Parent, weeks),
        newPerWeek(Child, weeks),
        newPerWeek(Book, weeks),
        newPerWeek(BookRead, weeks),
        diskOf(uploadsDir),
      ]);

      // Escrita
      const published = books.filter((b) => b.published !== false);
      const drafts = books.filter((b) => b.published === false);
      const wordsOf = (b) => (b.chapters || []).reduce((sum, c) => sum + wordsIn(c.html || ''), 0);
      const publishedWords = published.map(wordsOf);
      const draftWords = drafts.reduce((sum, b) => sum + wordsOf(b), 0);
      const totalWords = publishedWords.reduce((a, b) => a + b, 0) + draftWords;
      const wordBuckets = WORD_BUCKETS.map((bucket, i) => ({
        label: bucket.label,
        books: publishedWords.filter((w) => w <= bucket.max && (i === 0 || w > WORD_BUCKETS[i - 1].max)).length,
      }));
      const imageRow = imageTotals[0] || { count: 0, bytes: 0, books: [] };

      // Atividade diária
      const activeByDay = Object.fromEntries(days.map((d) => [d, { child: 0, parent: 0 }]));
      for (const a of actives) if (activeByDay[a.day]) activeByDay[a.day][a.who] += 1;
      const uniqueChildren = (from, to) =>
        new Set(actives.filter((a) => a.who === 'child' && a.day >= from && a.day <= to).map((a) => String(a.personId)));
      const wau = uniqueChildren(addDays(today, -6), today).size;
      const mau = uniqueChildren(addDays(today, -29), today).size;

      // Retenção: das crianças ativas numa semana, quantas voltaram na seguinte.
      const retention = weeks.slice(-8).map((week) => {
        const before = uniqueChildren(addDays(week, -7), addDays(week, -1));
        const now = uniqueChildren(week, addDays(week, 6));
        const back = [...before].filter((id) => now.has(id)).length;
        return { week, previous: before.size, returned: back, rate: before.size ? back / before.size : null };
      });

      const recentChildren = actives.filter((a) => a.who === 'child' && a.day >= addDays(today, -29));
      const devices = countBy(recentChildren.map((a) => a.device), ['mobile', 'tablet', 'desktop']);

      const statsByDay = Object.fromEntries(days.map((d) => [d, {}]));
      for (const s of dailyStats) if (statsByDay[s.day]) statsByDay[s.day][s.key] = s.count;
      const statSeries = (key) => days.map((d) => statsByDay[d][key] || 0);

      const linkCounts = Object.fromEntries(links.map((l) => [l._id, l.n]));
      const methods = { picture: 0, text: 0, both: 0 };
      for (const c of children) {
        if (c.picturePasswordHash && c.textPasswordHash) methods.both += 1;
        else if (c.picturePasswordHash) methods.picture += 1;
        else if (c.textPasswordHash) methods.text += 1;
      }

      let cache = 'down';
      try {
        cache = (await redis.ping()) === 'PONG' ? 'ok' : 'down';
      } catch {
        cache = 'down';
      }

      res.json({
        generatedAt: new Date().toISOString(),
        totals: {
          families,
          children: children.length,
          booksPublished: published.length,
          drafts: drafts.length,
          words: totalWords,
          images: imageRow.count,
          imageBytes: imageRow.bytes,
          reads,
          friendships: linkCounts.accepted || 0,
          pendingInvites: linkCounts.pending || 0,
          groups,
        },
        growth: {
          weeks,
          families: growthFamilies,
          children: growthChildren,
          books: growthBooks,
          reads: growthReads,
        },
        activity: {
          days,
          children: days.map((d) => activeByDay[d].child),
          parents: days.map((d) => activeByDay[d].parent),
          dau: activeByDay[today].child,
          wau,
          mau,
          retention,
          devices,
        },
        logins: {
          days,
          pictureOk: statSeries('child_login_picture_ok'),
          pictureFail: statSeries('child_login_picture_fail'),
          textOk: statSeries('child_login_text_ok'),
          textFail: statSeries('child_login_text_fail'),
          locked: statSeries('child_login_locked'),
          parent: statSeries('parent_login'),
        },
        writing: {
          wordsPerBook: published.length ? Math.round(publishedWords.reduce((a, b) => a + b, 0) / published.length) : 0,
          wordsPerChild: children.length ? Math.round(totalWords / children.length) : 0,
          wordBuckets,
          chaptered: books.filter((b) => b.chaptered !== false).length,
          continuous: books.filter((b) => b.chaptered === false).length,
          withImages: imageRow.books.length,
          favorites: books.filter((b) => b.favorite).length,
          beingRead: books.filter((b) => b.progress?.updatedAt).length,
          activeDrafts: drafts.filter((b) => b.updatedAt >= staleBefore).length,
          staleDrafts: drafts.filter((b) => b.updatedAt < staleBefore).length,
        },
        sharing: countBy(published.map((b) => b.visibility || 'private'), ['private', 'family', 'people']),
        themes: countBy(children.map((c) => c.theme || 'fadas'), THEMES),
        loginMethods: methods,
        topRead: topReadRows,
        health: {
          mongo: mongoose.connection.readyState === 1 ? 'ok' : 'down',
          redis: cache,
          version,
          uptimeSeconds: Math.round(process.uptime()),
          disk,
          errors: statSeries('server_error'),
        },
      });
    }),
  );

  return router;
}

module.exports = { createAdminRouter, wordsIn };
