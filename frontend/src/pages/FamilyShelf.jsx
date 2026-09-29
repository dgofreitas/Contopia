import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { themeFor } from '../scene/themes';
import { BookCover } from '../components/BookCover';
import { Emoji } from '../components/Emoji';
import { TopBar } from '../components/TopBar';

/**
 * Estante da família: os livros que os irmãos publicaram para a família.
 * Aqui só se lê; quem escreveu continua sendo o único que muda o livro.
 */
export function FamilyShelf() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [children, setChildren] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/books/family').then((data) => setChildren(data.children)).catch((err) => setError(messageFor(err)));
  }, []);

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar>
        <Link to="/estante" className="btn btn--small">📚 Minha estante</Link>
      </TopBar>

      <section className="paper atelier" aria-labelledby="family-title">
        <h1 id="family-title" className="form__title">👨‍👩‍👧 Estante da família</h1>
        <p className="muted">Livros que seus irmãos escreveram e quiseram mostrar para a família.</p>

        {error && <p className="error" role="alert">{error}</p>}
        {children === null && !error && <p className="muted">Arrumando os livros...</p>}
        {children?.length === 0 && <p className="muted">Ninguém da família publicou um livro para vocês ainda.</p>}
        {children?.map((child) => (
          <section key={child.id} className="family-shelf" aria-label={`Livros de ${child.nickname}`}>
            <h2 className="family-shelf__who"><Emoji char={child.avatar} /> {child.nickname}</h2>
            <ul className="drafts">
              {child.books.map((book, i) => (
                <motion.li
                  key={book.id}
                  className="draft"
                  initial={reduce ? false : { y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: reduce ? 0 : Math.min(i, 10) * 0.05 }}
                >
                  <button type="button" className="draft__open" onClick={() => navigate(`/livro/${book.id}/ler`)} aria-label={`Ler ${book.title}, de ${child.nickname}`}>
                    <BookCover title={book.title} author={child.nickname} color={book.cover.color} sticker={book.cover.sticker} gold={theme.gold} size="sm" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}
