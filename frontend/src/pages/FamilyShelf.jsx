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

// Quem mandou livro por último aparece primeiro.
const latest = (person) => Math.max(...person.books.map((b) => new Date(b.updatedAt || 0).getTime()));

/**
 * Estante da família e dos amigos. Uma lista com quem mandou livros (lateral no
 * computador, faixa de avatares no celular) e a estante de quem a criança
 * escolher, com a plaquinha do nome. Abre na pessoa que mandou livro por último;
 * a bolinha avisa quem tem livro que a criança ainda não abriu. Aqui só se lê.
 */
export function FamilyShelf() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [shelves, setShelves] = useState(null);
  const [personId, setPersonId] = useState(null);
  const [selected, setSelected] = useState(null);
  // Livro voltando para a prateleira: a lombada só reaparece quando ele chega.
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/books/family')
      .then((data) => {
        const friends = data.friends || [];
        setShelves({ family: data.children, friends });
        const everyone = [...data.children, ...friends];
        if (everyone.length > 0) setPersonId(everyone.reduce((a, b) => (latest(b) > latest(a) ? b : a)).id);
      })
      .catch((err) => setError(messageFor(err)));
  }, []);

  const putBack = () => {
    setReturningId(selected.book.id);
    setSelected(null);
  };
  const hiddenId = selected?.book.id || returningId;
  const empty = shelves && shelves.family.length + shelves.friends.length === 0;
  const person = shelves && [...shelves.family, ...shelves.friends].find((p) => p.id === personId);

  const personButton = (p) => (
    <li key={p.id}>
      <button type="button" className="person" aria-pressed={p.id === personId} onClick={() => setPersonId(p.id)} aria-label={`${p.nickname}${p.newBooks ? `, ${p.newBooks === 1 ? '1 livro novo' : `${p.newBooks} livros novos`}` : ''}`}>
        <span className="person__avatar" aria-hidden="true">
          <Emoji char={p.avatar} />
          {p.newBooks > 0 && <span className="person__new" />}
        </span>
        <span className="person__name">
          {p.nickname}
          {p.familyName && <small>@{p.familyName}</small>}
        </span>
        <span className="person__count" aria-hidden="true">{p.books.length}</span>
      </button>
    </li>
  );

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

      {shelves === null && !error && <p className="hint">Arrumando os livros...</p>}
      {empty && <p className="hint">Ninguém mandou um livro para você ainda.</p>}
      {shelves && !empty && (
        <div className="visit">
          <nav className="people" aria-label="De quem é a estante">
            {shelves.family.length > 0 && (
              <>
                <p className="people__group"><span className="people__icon" aria-hidden="true">👨‍👩‍👧 </span>Família</p>
                <ul>{shelves.family.map(personButton)}</ul>
              </>
            )}
            {shelves.friends.length > 0 && (
              <>
                <p className="people__group"><span className="people__icon" aria-hidden="true">💌 </span>Amigos</p>
                <ul>{shelves.friends.map(personButton)}</ul>
              </>
            )}
          </nav>
          <section className="visit__shelf" aria-label={person ? `Estante de ${person.nickname}` : undefined}>
            {person && authorShelf(person)}
          </section>
        </div>
      )}

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
