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
 * Estante da família e dos amigos: os livros que os irmãos publicaram para a
 * família e os que crianças de famílias amigas mandaram para esta criança.
 * Aqui só se lê; quem escreveu continua sendo o único que muda o livro.
 */
export function FamilyShelf() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [shelves, setShelves] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/books/family').then((data) => setShelves({ family: data.children, friends: data.friends || [] })).catch((err) => setError(messageFor(err)));
  }, []);

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar>
        <Link to="/estante" className="btn btn--small">📚 Minha estante</Link>
      </TopBar>

      <section className="paper atelier" aria-labelledby="family-title">
        <h1 id="family-title" className="form__title">👨‍👩‍👧 Família e amigos</h1>
        <p className="muted">Livros que seus irmãos e seus amigos escreveram e quiseram mostrar para você.</p>

        {error && <p className="error" role="alert">{error}</p>}
        {shelves === null && !error && <p className="muted">Arrumando os livros...</p>}
        {shelves && shelves.family.length + shelves.friends.length === 0 && (
          <p className="muted">Ninguém mandou um livro para você ainda.</p>
        )}
        {shelves?.family.map((child) => (
          <AuthorShelf key={child.id} author={child} books={child.books} gold={theme.gold} reduce={reduce} onRead={(id) => navigate(`/livro/${id}/ler`)} />
        ))}
        {shelves?.friends.length > 0 && <h2 className="family-shelf__group">💌 Dos amigos</h2>}
        {shelves?.friends.map((child) => (
          <AuthorShelf key={child.id} author={child} books={child.books} gold={theme.gold} reduce={reduce} onRead={(id) => navigate(`/livro/${id}/ler`)} />
        ))}
      </section>
    </main>
  );
}

// Os livros de uma criança; de família amiga, aparece também o @nome da família.
function AuthorShelf({ author, books, gold, reduce, onRead }) {
  return (
    <section className="family-shelf" aria-label={`Livros de ${author.nickname}`}>
      <h2 className="family-shelf__who">
        <Emoji char={author.avatar} /> {author.nickname}
        {author.familyName && <span className="family-shelf__family">@{author.familyName}</span>}
      </h2>
      <ul className="drafts">
        {books.map((book, i) => (
          <motion.li
            key={book.id}
            className="draft"
            initial={reduce ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : Math.min(i, 10) * 0.05 }}
          >
            <button type="button" className="draft__open" onClick={() => onRead(book.id)} aria-label={`Ler ${book.title}, de ${author.nickname}`}>
              <BookCover title={book.title} author={author.nickname} color={book.cover.color} sticker={book.cover.sticker} gold={gold} size="sm" />
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
