import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { themeFor } from '../scene/themes';
import { BookCover } from '../components/BookCover';
import { NewBook } from '../components/NewBook';
import { TopBar } from '../components/TopBar';

/**
 * Ateliê: onde ficam os livros que a criança ainda está escrevendo. Quando ela
 * publica, o livro sai daqui e vai para a estante.
 */
export function Atelier() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [books, setBooks] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/books').then((data) => setBooks(data.books.filter((b) => !b.published))).catch((err) => setError(messageFor(err)));
  }, []);

  const publish = async (book) => {
    setError('');
    try {
      await api.patch(`/books/${book.id}`, { published: true });
      navigate('/estante', { state: { published: book.title } });
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const remove = async (book) => {
    if (!window.confirm(`Apagar "${book.title}"? Depois não dá para trazer de volta.`)) return;
    setError('');
    try {
      await api.del(`/books/${book.id}`);
      setBooks((list) => list.filter((b) => b.id !== book.id));
    } catch (err) {
      setError(messageFor(err));
    }
  };

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar>
        <Link to="/estante" className="btn btn--small">📚 Estante</Link>
      </TopBar>

      <section className="paper atelier" aria-labelledby="atelier-title">
        <h1 id="atelier-title" className="form__title">✏️ Ateliê</h1>
        <p className="muted">Aqui ficam os livros que você está escrevendo. Quando terminar, publique e ele vai para a estante!</p>

        {error && <p className="error" role="alert">{error}</p>}
        {books === null ? (
          <p className="muted">Arrumando a mesa...</p>
        ) : (
          <ul className="drafts">
            <li>
              <button type="button" className="draft draft--new" onClick={() => setCreating(true)}>
                <span className="draft__plus" aria-hidden="true">+</span>
                Livro novo
              </button>
            </li>
            {books.map((book, i) => (
              <motion.li
                key={book.id}
                layout={!reduce}
                className="draft"
                initial={reduce ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: reduce ? 0 : Math.min(i, 10) * 0.05 }}
              >
                <button type="button" className="draft__open" onClick={() => navigate(`/livro/${book.id}/escrever`)} aria-label={`Escrever ${book.title}`}>
                  <BookCover title={book.title} author={me.child.nickname} color={book.cover.color} sticker={book.cover.sticker} gold={theme.gold} size="sm" />
                </button>
                <div className="draft__actions">
                  <button type="button" className="btn btn--small" onClick={() => navigate(`/livro/${book.id}/escrever`)}>✏️ Escrever</button>
                  <button type="button" className="btn btn--small btn--primary" onClick={() => publish(book)} aria-label={`Publicar ${book.title}`}>📚 Publicar</button>
                  <button type="button" className="btn btn--small btn--ghost" onClick={() => remove(book)} aria-label={`Apagar ${book.title}`}>🗑️ Apagar</button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
        {books?.length === 0 && <p className="muted">Nenhum livro sendo escrito agora. Que tal começar um?</p>}
      </section>

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
