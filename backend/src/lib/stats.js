const DailyActive = require('../models/daily-active');
const DailyStat = require('../models/daily-stat');

const TIME_ZONE = 'America/Sao_Paulo';
const SEEN_TTL_SECONDS = 2 * 24 * 60 * 60;

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// Dia (AAAA-MM-DD) no horário de Brasília, que é o dia das famílias.
function dayOf(date = new Date()) {
  return dayFormat.format(date);
}

// Soma dias a um AAAA-MM-DD sem depender do fuso do servidor.
function addDays(day, n) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

// Segunda-feira da semana de um dia.
function weekOf(day) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

function deviceOf(userAgent = '') {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

// Soma 1 num contador do dia. Nunca derruba a requisição.
function count(key) {
  return DailyStat.updateOne({ day: dayOf(), key }, { $inc: { count: 1 } }, { upsert: true }).catch((err) => {
    console.error('stats', err.message);
  });
}

// Marca a pessoa da sessão como ativa hoje. O Redis evita uma escrita no banco a
// cada requisição: só a primeira do dia chega ao Mongo.
function trackActive(redis, session, userAgent) {
  const day = dayOf();
  const people = [];
  if (session.childId) people.push(['child', session.childId]);
  if (session.role === 'parent' && session.parentId) people.push(['parent', session.parentId]);
  return Promise.all(
    people.map(async ([who, personId]) => {
      const fresh = await redis.set(`seen:${day}:${who}:${personId}`, '1', 'EX', SEEN_TTL_SECONDS, 'NX');
      if (!fresh) return;
      await DailyActive.updateOne(
        { day, who, personId },
        { $setOnInsert: { device: deviceOf(userAgent) } },
        { upsert: true },
      );
    }),
  ).catch((err) => {
    console.error('stats', err.message);
  });
}

function activityMiddleware(redis) {
  return (req, res, next) => {
    if (req.session) trackActive(redis, req.session, req.headers['user-agent']);
    next();
  };
}

module.exports = { TIME_ZONE, dayOf, addDays, weekOf, deviceOf, count, trackActive, activityMiddleware };
