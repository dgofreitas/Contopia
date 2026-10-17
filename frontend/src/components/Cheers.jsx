import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { REACTIONS } from '../lib/constants';
import { Emoji } from './Emoji';

const NAMES = { '😂': 'Engraçado', '🤩': 'Incrível', '😱': 'Que susto', '😢': 'Emocionante', '❤️': 'Amei', '👏': 'Parabéns' };

/**
 * No fim do livro de outra criança: figurinhas para dar ao autor e o pedido
 * "quero o próximo capítulo". A figurinha escolhida pula e sai voando.
 */
export function CheerBar({ bookId, author }) {
  const reduce = useReducedMotion();
  const [cheers, setCheers] = useState(null);
  const [error, setError] = useState('');
  // Figurinhas voando agora, cada uma com sua chave.
  const [flying, setFlying] = useState([]);
  const bar = useRef(null);

  useEffect(() => {
    api.get(`/books/${bookId}/cheers`).then((data) => setCheers(data.cheers)).catch(() => {});
  }, [bookId]);

  // Fica embaixo do livro: rola até aparecer, para a criança não perder.
  const enabled = Boolean(cheers?.enabled);
  useEffect(() => {
    if (enabled) bar.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [enabled, reduce]);

  if (!cheers?.enabled) return null;

  const send = async (path, body) => {
    setError('');
    try {
      const { cheers: saved } = await api.put(`/books/${bookId}/${path}`, body);
      setCheers(saved);
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const toggle = (emoji) => {
    const on = !cheers.mine.includes(emoji);
    if (on && !reduce) setFlying((list) => [...list, { emoji, key: `${emoji}${Date.now()}` }]);
    send('reactions', { emoji, on });
  };
  const countOf = (emoji) => cheers.reactions.find((r) => r.emoji === emoji)?.count || 0;

  return (
    <section ref={bar} className="cheer-bar" aria-label={`Figurinhas para ${author}`}>
      <p className="cheer-bar__ask">Gostou? Dê uma figurinha para {author}!</p>
      <div className="cheer-bar__stickers">
        {REACTIONS.map((emoji) => {
          const mine = cheers.mine.includes(emoji);
          const count = countOf(emoji);
          return (
            <motion.button
              key={emoji}
              type="button"
              className="cheer"
              aria-pressed={mine}
              aria-label={`${NAMES[emoji]}${count > 0 ? `, ${count}` : ''}`}
              onClick={() => toggle(emoji)}
              whileTap={reduce ? undefined : { scale: 1.35, rotate: -8 }}
            >
              <Emoji char={emoji} />
              {count > 0 && <span className="cheer__count">{count}</span>}
            </motion.button>
          );
        })}
      </div>
      {cheers.canWantMore && (
        <motion.button
          type="button"
          className={`btn${cheers.wantsMore ? ' btn--primary' : ''} want-more`}
          aria-pressed={cheers.wantsMore}
          onClick={() => send('more', { on: !cheers.wantsMore })}
          whileTap={reduce ? undefined : { scale: 0.94 }}
        >
          <Emoji char="🔔" /> {cheers.wantsMore ? `${author} já sabe que você quer mais!` : 'Quero o próximo capítulo!'}
        </motion.button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <AnimatePresence>
        {flying.map((f) => (
          <motion.span
            key={f.key}
            className="cheer-fly"
            aria-hidden="true"
            initial={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{ y: -260, scale: 2.6, opacity: 0, rotate: 18 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            onAnimationComplete={() => setFlying((list) => list.filter((x) => x.key !== f.key))}
            style={{ left: `${(REACTIONS.indexOf(f.emoji) + 0.5) * (100 / REACTIONS.length)}%` }}
          >
            <Emoji char={f.emoji} />
          </motion.span>
        ))}
      </AnimatePresence>
    </section>
  );
}

/**
 * Para o autor, embaixo do livro tirado da estante: as figurinhas que ganhou e
 * quem quer o próximo capítulo. Ao abrir, as figurinhas deixam de ser novidade.
 */
export function CheersPanel({ bookId, onSeen }) {
  const reduce = useReducedMotion();
  const [cheers, setCheers] = useState(null);

  useEffect(() => {
    api
      .get(`/books/${bookId}/cheers`)
      .then(({ cheers: loaded }) => {
        setCheers(loaded);
        if (loaded.reactions.some((r) => r.new > 0)) api.post(`/books/${bookId}/cheers/seen`).then(onSeen, () => {});
      })
      .catch(() => {});
    // onSeen muda a cada render da estante; só carrega de novo se o livro mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  if (!cheers || (cheers.reactions.length === 0 && cheers.wantMore.length === 0)) return null;

  return (
    <motion.div className="cheers-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}>
      {cheers.reactions.length > 0 && (
        <ul className="cheers-panel__stickers" aria-label="Figurinhas que você ganhou">
          {cheers.reactions.map((r, i) => (
            <motion.li
              key={r.emoji}
              className={`cheers-panel__sticker${r.new > 0 ? ' cheers-panel__sticker--new' : ''}`}
              initial={reduce ? false : { scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 1 + i * 0.12, type: 'spring', stiffness: 320, damping: 14 }}
              aria-label={`${NAMES[r.emoji]}: ${r.count}${r.new > 0 ? `, ${r.new} nova${r.new > 1 ? 's' : ''}` : ''}`}
            >
              <Emoji char={r.emoji} /> <span>{r.count}</span>
            </motion.li>
          ))}
        </ul>
      )}
      {cheers.fans.length > 0 && (
        <p className="cheers-panel__fans">
          {cheers.fans.map((f) => (
            <span key={f.id} className="fan">
              <Emoji char={f.avatar} /> {f.nickname}
            </span>
          ))}
        </p>
      )}
      {cheers.wantMore.length > 0 && (
        <p className="cheers-panel__more" role="status">
          <motion.span
            className="bell"
            aria-hidden="true"
            animate={reduce ? undefined : { rotate: [0, -18, 16, -10, 6, 0] }}
            transition={{ delay: 1.2, duration: 0.9, repeat: Infinity, repeatDelay: 2.5 }}
          >
            <Emoji char="🔔" />
          </motion.span>
          {wantMoreText(cheers.wantMore)}
        </p>
      )}
    </motion.div>
  );
}

function wantMoreText(people) {
  const names = people.map((p) => p.nickname);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  return `${list} ${names.length === 1 ? 'quer' : 'querem'} o próximo capítulo!`;
}

// A gota mais lenta: atraso de até 1,2 s mais 3,6 s de queda.
const RAIN_MS = 5000;

/** Chuva de figurinhas pela tela, quando o autor chega na estante com figurinhas novas. */
export function StickerRain({ onDone }) {
  const reduce = useReducedMotion();
  const drops = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        emoji: REACTIONS[i % REACTIONS.length],
        left: Math.random() * 96,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 1.4,
        spin: (Math.random() - 0.5) * 540,
      })),
    [],
  );
  useEffect(() => {
    const timer = setTimeout(onDone, RAIN_MS);
    return () => clearTimeout(timer);
  }, [onDone]);
  if (reduce) return null;
  return (
    <div className="sticker-rain" aria-hidden="true">
      {drops.map((d, i) => (
        <motion.span
          key={i}
          className="sticker-rain__drop"
          style={{ left: `${d.left}%` }}
          initial={{ y: '-10vh', rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: d.spin, opacity: [1, 1, 0.8] }}
          transition={{ delay: d.delay, duration: d.duration, ease: 'easeIn' }}
        >
          <Emoji char={d.emoji} />
        </motion.span>
      ))}
    </div>
  );
}
