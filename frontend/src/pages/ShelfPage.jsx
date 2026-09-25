import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { COVER_COLORS, STICKERS } from '../lib/constants';
import { Scene } from '../scene/Scene';
import { THEME_LIST, themeFor } from '../scene/themes';
import { Shelf } from '../components/Shelf';
import { BookCover } from '../components/BookCover';
import { TopBar } from '../components/TopBar';

export function ShelfPage() {
  const navigate = useNavigate();
  const { me, setChild } = useAuth();
  const theme = themeFor(me.child.theme);
  const [books, setBooks] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/books').then((data) => setBooks(data.books)).catch((err) => setError(messageFor(err)));
  }, []);

  const changeTheme = async (id) => {
    setChild({ ...me.child, theme: id });
    try {
      await api.patch('/auth/me/theme', { theme: id });
    } catch {
      // o tema é só preferência: se falhar, fica valendo nesta visita
    }
  };

  const toggleFavorite = async (book) => {
    const favorite = !book.favorite;
    setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, favorite } : b)));
    try {
      await api.patch(`/books/${book.id}`, { favorite });
    } catch (err) {
      setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, favorite: !favorite } : b)));
      setError(messageFor(err));
    }
  };

  const selected = books?.find((b) => b.id === selectedId);
  const reading = books?.filter((b) => b.progress).sort((a, b) => new Date(b.progress.updatedAt) - new Date(a.progress.updatedAt))[0];

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar />

      <nav className="themes" aria-label="Tema da estante">
        {THEME_LIST.map((item) => (
          <button key={item.id} type="button" className="theme-chip" aria-pressed={item.id === theme.id} onClick={() => changeTheme(item.id)}>
            <span aria-hidden="true">{item.icon}</span> {item.name}
          </button>
        ))}
      </nav>

      {reading && !selectedId && (
        <button type="button" className="continue" onClick={() => navigate(`/livro/${reading.id}/ler`)}>
          🔖 Continuar lendo <strong>{reading.title}</strong>
        </button>
      )}

      {error && <p className="error error--floating" role="alert">{error}</p>}

      <LayoutGroup>
        <section className="room__shelf" aria-label={`Estante de ${me.child.nickname}`}>
          {books === null ? (
            <p className="hint">Arrumando os livros...</p>
          ) : (
            <>
              <Shelf books={books} theme={theme} selectedId={selectedId} onSelect={setSelectedId} onNew={() => setCreating(true)} />
              {books.length === 0 && <p className="hint">Sua estante está vazia. Que tal escrever o primeiro livro?</p>}
            </>
          )}
        </section>

        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.id}
              className="overlay"
              role="dialog"
              aria-modal="true"
              aria-label={selected.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              onKeyDown={(e) => e.key === 'Escape' && setSelectedId(null)}
            >
              <motion.div layoutId={`book-${selected.id}`} className="overlay__book" onClick={(e) => e.stopPropagation()} transition={{ type: 'spring', stiffness: 200, damping: 26 }}>
                <BookCover title={selected.title} author={me.child.nickname} color={selected.cover.color} sticker={selected.cover.sticker} gold={theme.gold} size="lg" />
              </motion.div>
              <div className="overlay__actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn btn--primary" onClick={() => navigate(`/livro/${selected.id}/ler`)} autoFocus>
                  📖 {selected.progress ? 'Continuar lendo' : 'Ler'}
                </button>
                <button type="button" className="btn" onClick={() => navigate(`/livro/${selected.id}/escrever`)}>✏️ Escrever</button>
                <button type="button" className="btn" aria-pressed={selected.favorite} onClick={() => toggleFavorite(selected)}>
                  {selected.favorite ? '★ Favorito' : '☆ Favoritar'}
                </button>
                <button type="button" className="btn btn--ghost-light" onClick={() => setSelectedId(null)}>Guardar na estante</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      <AnimatePresence>
        {creating && (
          <NewBook
            author={me.child.nickname}
            gold={theme.gold}
            onClose={() => setCreating(false)}
            onCreated={(book) => navigate(`/livro/${book.id}/escrever`)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function NewBook({ author, gold, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [sticker, setSticker] = useState(STICKERS[1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { book } = await api.post('/books', { title: title.trim(), cover: { color, sticker } });
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
                  {s || '∅'}
                </button>
              ))}
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
