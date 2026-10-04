// Métricas de exemplo no formato de GET /admin/metrics.
const day = (i, start = '2026-08-06') => {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
};

export function sampleMetrics() {
  const days = Array.from({ length: 60 }, (_, i) => day(i));
  const weeks = Array.from({ length: 26 }, (_, i) => day(i * 7, '2026-04-13'));
  const wave = (n, base, amp) => Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + amp * Math.sin(i / 3) + i / 4)));
  return {
    generatedAt: '2026-10-04T16:00:00Z',
    totals: { families: 12, children: 21, booksPublished: 48, drafts: 17, words: 35210, images: 64, imageBytes: 18_400_000, reads: 93, friendships: 5, pendingInvites: 1, groups: 4 },
    growth: { weeks, families: weeks.map((_, i) => (i % 2 === 0 && i > 1 ? 1 : 0)), children: weeks.map((_, i) => (i > 4 && i % 5 !== 0 ? 1 : 0)), books: wave(26, 2, 2), reads: wave(26, 3, 3) },
    activity: {
      days,
      children: wave(60, 5, 3),
      parents: wave(60, 2, 1),
      dau: 7,
      wau: 14,
      mau: 19,
      retention: weeks.slice(-8).map((week, i) => ({ week, previous: 10, returned: 5 + (i % 4), rate: (5 + (i % 4)) / 10 })),
      devices: { mobile: 40, tablet: 22, desktop: 61 },
    },
    logins: { days, pictureOk: wave(60, 4, 2), pictureFail: wave(60, 1, 1).map((v) => v % 3), textOk: wave(60, 1, 1), textFail: days.map(() => 0), locked: days.map((_, i) => (i % 17 === 0 ? 1 : 0)), parent: wave(60, 2, 1) },
    writing: {
      wordsPerBook: 612,
      wordsPerChild: 1677,
      wordBuckets: [
        { label: 'Até 50', books: 6 },
        { label: '51 a 200', books: 11 },
        { label: '201 a 500', books: 14 },
        { label: '501 a 1.000', books: 10 },
        { label: 'Mais de 1.000', books: 7 },
      ],
      chaptered: 30,
      continuous: 35,
      withImages: 19,
      favorites: 22,
      beingRead: 26,
      activeDrafts: 9,
      staleDrafts: 8,
    },
    sharing: { private: 20, family: 19, people: 9 },
    themes: { fadas: 6, misterio: 4, assombracao: 3, princesa: 8 },
    loginMethods: { picture: 13, text: 5, both: 3 },
    topRead: [
      { title: 'O Dragão Tímido', reads: 9 },
      { title: 'A Escola Assombrada', reads: 7 },
      { title: 'Diário de Férias na Praia', reads: 4 },
    ],
    health: { mongo: 'ok', redis: 'ok', version: '1.15.0', uptimeSeconds: 200000, disk: { free: 31e9, total: 47e9 }, errors: days.map((_, i) => (i === 50 ? 3 : 0)) },
  };
}
