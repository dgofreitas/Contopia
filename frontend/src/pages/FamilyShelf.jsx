import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { themeFor } from '../scene/themes';
import { Emoji } from '../components/Emoji';
import { Shelf } from '../components/Shelf';
import { FlyingBook } from '../components/FlyingBook';
import { TopBar } from '../components/TopBar';

/**
 * Estante da família e dos amigos: uma prateleira para cada criança que mandou
 * livros, com uma plaquinha com o nome. Primeiro os irmãos (o que publicaram
 * para a família), depois os amigos de famílias amigas. Aqui só se lê; quem
 * escreveu continua sendo o único que muda o livro.
 */
export function FamilyShelf() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [shelves, setShelves] = useState(null);
  const [selected, setSelected] = useState(null);
  // Livro voltando para a prateleira: a lombada só reaparece quando ele chega.
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/books/family').then((data) => setShelves({ family: data.children, friends: data.friends || [] })).catch((err) => setError(messageFor(err)));
  }, []);

  const putBack = () => {
    setReturningId(selected.book.id);
    setSelected(null);
  };
  const hiddenId = selected?.book.id || returningId;
  const empty = shelves && shelves.family.length + shelves.friends.length === 0;

  const authorShelf = (author) => (
    <div key={author.id} className="author-shelf" style={{ '--wood-l': theme.wood[1], '--wood-d': theme.wood[2] }}>
      <p className="plaque">
        <Emoji char={author.avatar} /> {author.nickname}
        {author.familyName && <span className="plaque__family">@{author.familyName}</span>}
      </p>
      <Shelf
        books={author.books}
        theme={theme}
        hiddenId={hiddenId}
        label={`Livros de ${author.nickname}`}
        onSelect={(id) => setSelected({ book: author.books.find((b) => b.id === id), author })}
      />
    </div>
  );

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar />

      <h1 className="room__title">👨‍👩‍👧 Família e amigos</h1>
      {error && <p className="error error--floating" role="alert">{error}</p>}

      <section className="room__shelf room__shelf--stack" aria-label="Livros da família e dos amigos">
        {shelves === null && !error && <p className="hint">Arrumando os livros...</p>}
        {empty && <p className="hint">Ninguém mandou um livro para você ainda.</p>}
        {shelves?.family.map(authorShelf)}
        {shelves?.friends.length > 0 && <h2 className="room__subtitle">💌 Dos amigos</h2>}
        {shelves?.friends.map(authorShelf)}
      </section>

      <AnimatePresence onExitComplete={() => setReturningId(null)}>
        {selected && (
          <motion.div
            key={selected.book.id}
            className="overlay"
            role="dialog"
            aria-modal="true"
            aria-label={selected.book.title}
            onClick={putBack}
            onKeyDown={(e) => e.key === 'Escape' && putBack()}
          >
            <motion.div className="overlay__backdrop" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.35, duration: 0.5 } }} />
            <div onClick={(e) => e.stopPropagation()}>
              <FlyingBook book={selected.book} author={selected.author.nickname} gold={theme.gold} />
            </div>
            <motion.div
              className="overlay__actions"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.75 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <button type="button" className="btn btn--primary" onClick={() => navigate(`/livro/${selected.book.id}/ler`)} autoFocus>📖 Ler</button>
              <button type="button" className="btn btn--ghost-light" onClick={putBack}>Guardar na estante</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
