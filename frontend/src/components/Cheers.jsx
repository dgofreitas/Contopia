import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { REACTIONS } from '../lib/constants';
import { Emoji } from './Emoji';

const MAX_COMMENT = 300;

const NAMES = { '😂': 'Engraçado', '🤩': 'Incrível', '😱': 'Que susto', '😢': 'Emocionante', '❤️': 'Amei', '👏': 'Parabéns' };

/**
 * No fim do livro de outra criança: figurinhas para dar ao autor, o pedido
 * "quero o próximo capítulo" e os recados escritos. A figurinha escolhida pula
 * e sai voando.
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

  const write = async (text) => {
    setError('');
    try {
      const { cheers: saved } = await api.post(`/books/${bookId}/comments`, { text });
      setCheers(saved);
      return true;
    } catch (err) {
      setError(messageFor(err));
      return false;
    }
  };
  const removeComment = async (comment) => {
    setError('');
    try {
      await api.del(`/books/${bookId}/comments/${comment.id}`);
      setCheers((c) => ({ ...c, comments: c.comments.filter((x) => x.id !== comment.id) }));
    } catch (err) {
      setError(messageFor(err));
    }
  };

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
      <CommentList comments={cheers.comments} onRemove={removeComment} />
      <CommentBox author={author} onSend={write} />
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

// Recados do livro. Texto puro: o React escapa tudo, nada vira HTML.
function CommentList({ comments, onRemove }) {
  const reduce = useReducedMotion();
  if (comments.length === 0) return null;
  return (
    <ul className="comments" aria-label="Recados">
      <AnimatePresence initial={false}>
        {comments.map((c) => (
          <motion.li
            key={c.id}
            className={`comment${c.mine ? ' comment--mine' : ''}${c.new ? ' comment--new' : ''}`}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <span className="comment__who"><Emoji char={c.by.avatar} /> {c.by.nickname}</span>
            <p className="comment__text">{c.text}</p>
            {c.canDelete && (
              <button type="button" className="comment__remove" onClick={() => onRemove(c)} aria-label={`Apagar recado de ${c.by.nickname}`}>✕</button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function CommentBox({ author, onSend }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    if (await onSend(text)) setText('');
    setBusy(false);
  };
  return (
    <form className="comment-box" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="comment-text">Recado para {author}</label>
      <textarea
        id="comment-text"
        className="comment-box__text"
        value={text}
        maxLength={MAX_COMMENT}
        rows={2}
        placeholder={`Escreva um recado para ${author}...`}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="comment-box__row">
        <span className="fine">{text.length}/{MAX_COMMENT}</span>
        <button type="submit" className="btn btn--small btn--primary" disabled={busy || !text.trim()}>
          <Emoji char="💬" /> Enviar recado
        </button>
      </div>
    </form>
  );
}

/**
 * Para o autor, embaixo do livro tirado da estante: as figurinhas e os recados
 * que ganhou e quem quer o próximo capítulo. Ao abrir, deixam de ser novidade.
 */
export function CheersPanel({ bookId, onSeen }) {
  const reduce = useReducedMotion();
  const [cheers, setCheers] = useState(null);

  useEffect(() => {
    api
      .get(`/books/${bookId}/cheers`)
      .then(({ cheers: loaded }) => {
        setCheers(loaded);
        if (loaded.reactions.some((r) => r.new > 0) || loaded.comments.some((c) => c.new)) api.post(`/books/${bookId}/cheers/seen`).then(onSeen, () => {});
      })
      .catch(() => {});
    // onSeen muda a cada render da estante; só carrega de novo se o livro mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  if (!cheers || (cheers.reactions.length === 0 && cheers.wantMore.length === 0 && cheers.comments.length === 0)) return null;

  const removeComment = async (comment) => {
    try {
      await api.del(`/books/${bookId}/comments/${comment.id}`);
      setCheers((c) => ({ ...c, comments: c.comments.filter((x) => x.id !== comment.id) }));
    } catch {
      // Fica na tela; tentar de novo resolve.
    }
  };

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
      <CommentList comments={cheers.comments} onRemove={removeComment} />
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
