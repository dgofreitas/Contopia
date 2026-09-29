import { useState } from 'react';
import { motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { COVER_COLORS, STICKERS } from '../lib/constants';
import { BookCover } from './BookCover';
import { Emoji } from './Emoji';

// Formulário do livro novo: título, capa e se vai ter capítulos.
export function NewBook({ author, gold, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [sticker, setSticker] = useState(STICKERS[1]);
  const [chaptered, setChaptered] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { book } = await api.post('/books', { title: title.trim(), cover: { color, sticker }, chaptered });
      onCreated(book);
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  };

  return (
    <motion.div className="overlay" role="dialog" aria-modal="true" aria-label="Livro novo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="paper new-book"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.95 }}
      >
        <BookCover title={title || 'Meu livro'} author={author} color={color} sticker={sticker} gold={gold} size="md" />
        <div className="stack">
          <h2 className="form__title">Livro novo</h2>
          <label className="field" htmlFor="book-title">
            Título
            <input id="book-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <fieldset className="field">
            <legend>Cor da capa</legend>
            <div className="swatches">
              {COVER_COLORS.map((c) => (
                <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={c === color} aria-label={`Cor ${c}`} onClick={() => setColor(c)} />
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>Figurinha</legend>
            <div className="stickers">
              {STICKERS.map((s) => (
                <button key={s || 'nenhuma'} type="button" className="sticker" aria-pressed={s === sticker} onClick={() => setSticker(s)} aria-label={s ? `Figurinha ${s}` : 'Sem figurinha'}>
                  {s ? <Emoji char={s} /> : '∅'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>Como vai ser o livro?</legend>
            <div className="tabs tabs--start" role="group">
              <button type="button" className="tab" aria-pressed={!chaptered} onClick={() => setChaptered(false)}>📜 Texto corrido</button>
              <button type="button" className="tab" aria-pressed={chaptered} onClick={() => setChaptered(true)}>📑 Com capítulos</button>
            </div>
          </fieldset>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row">
            <button type="submit" className="btn btn--primary" disabled={!title.trim() || busy}>Começar a escrever</button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}
