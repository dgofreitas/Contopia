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
const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/**
 * Estante da família e dos amigos. Uma lista com quem mandou livros (lateral no
 * computador, faixa de avatares no celular) e a estante de quem a criança
 * escolher, no tema que aquela criança escolheu para a estante dela, como uma
 * visita. Dá para fixar alguém no topo, esconder quem não quer ver e abrir os
 * próprios grupos de amigos para ver as prateleiras de todos juntos.
 * A bolinha avisa quem tem livro que a criança ainda não abriu. Aqui só se lê.
 */
export function FamilyShelf() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const myTheme = themeFor(me.child.theme);
  const [people, setPeople] = useState(null);
  const [groups, setGroups] = useState([]);
  // O que está aberto: a estante de uma pessoa ou as prateleiras de um grupo.
  const [view, setView] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState(null);
  // Livro voltando para a prateleira: a lombada só reaparece quando ele chega.
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/books/family')
      .then((data) => {
        const everyone = [...data.children.map((p) => ({ ...p, kind: 'family' })), ...(data.friends || []).map((p) => ({ ...p, kind: 'friend' }))];
        setPeople(everyone);
        const visible = everyone.filter((p) => !p.hidden);
        const first = (visible.length > 0 ? visible : everyone).reduce((a, b) => (latest(b) > latest(a) ? b : a), everyone[0]);
        if (first) setView({ kind: 'person', id: first.id });
      })
      .catch((err) => setError(messageFor(err)));
    api.get('/groups').then((data) => setGroups(data.groups)).catch(() => {});
  }, []);

  const mark = async (person, change) => {
    try {
      const flags = await api.put(`/books/people/${person.id}`, change);
      setPeople((list) => list.map((p) => (p.id === person.id ? { ...p, ...flags } : p)));
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const putBack = () => {
    setReturningId(selected.book.id);
    setSelected(null);
  };
  const hiddenId = selected?.book.id || returningId;
  const empty = people && people.length === 0;
  const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));

  // Grupos com alguém que mandou livro para esta criança.
  const groupShelves = groups
    .map((g) => ({ ...g, people: g.members.map((m) => byId[m.id]).filter(Boolean) }))
    .filter((g) => g.people.length > 0);

  const person = view?.kind === 'person' ? byId[view.id] : null;
  const group = view?.kind === 'group' ? groupShelves.find((g) => g.id === view.id) : null;
  // Visitando alguém, a estante aparece no tema dele.
  const theme = person ? themeFor(person.theme) : myTheme;

  const visible = (people || []).filter((p) => !p.hidden);
  const pinned = visible.filter((p) => p.pinned);
  const family = visible.filter((p) => !p.pinned && p.kind === 'family');
  const friends = visible.filter((p) => !p.pinned && p.kind === 'friend');
  const hidden = (people || []).filter((p) => p.hidden);

  const personButton = (p) => (
    <li key={p.id}>
      <button
        type="button"
        className="person"
        aria-pressed={view?.kind === 'person' && view.id === p.id}
        onClick={() => setView({ kind: 'person', id: p.id })}
        aria-label={`${p.nickname}${p.newBooks ? `, ${plural(p.newBooks, 'livro novo', 'livros novos')}` : ''}`}
      >
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

  const groupButton = (g) => (
    <li key={g.id}>
      <button
        type="button"
        className="person"
        aria-pressed={view?.kind === 'group' && view.id === g.id}
        onClick={() => setView({ kind: 'group', id: g.id })}
        aria-label={`Grupo ${g.name}`}
      >
        <span className="person__avatar" aria-hidden="true">
          <Emoji char="👥" />
          {g.people.some((p) => p.newBooks > 0) && <span className="person__new" />}
        </span>
        <span className="person__name">{g.name}</span>
        <span className="person__count" aria-hidden="true">{g.people.length}</span>
      </button>
    </li>
  );

  const section = (title, icon, items, render) =>
    items.length > 0 && (
      <>
        <p className="people__group"><span className="people__icon" aria-hidden="true">{icon} </span>{title}</p>
        <ul>{items.map(render)}</ul>
      </>
    );

  const authorShelf = (author, tools) => (
    <div key={author.id} className="author-shelf" style={{ '--wood-l': theme.wood[1], '--wood-d': theme.wood[2] }}>
      <div className="author-shelf__head">
        <p className="plaque">
          <Emoji char={author.avatar} /> {author.nickname}
          {author.familyName && <span className="plaque__family">@{author.familyName}</span>}
        </p>
        {tools && (
          <div className="shelf-tools">
            <button type="button" className="btn btn--small" aria-pressed={author.pinned} onClick={() => mark(author, { pinned: !author.pinned })}>
              {author.pinned ? '⭐ Fixado no topo' : '☆ Fixar no topo'}
            </button>
            <button type="button" className="btn btn--small" onClick={() => mark(author, { hidden: !author.hidden })}>
              {author.hidden ? '👀 Mostrar de novo' : '🙈 Esconder'}
            </button>
          </div>
        )}
      </div>
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

      <h1 className="room__title">
        {person ? `🏠 Estante de ${person.nickname}` : group ? `👥 ${group.name}` : '👨‍👩‍👧 Família e amigos'}
      </h1>
      {error && <p className="error error--floating" role="alert">{error}</p>}

      {people === null && !error && <p className="hint">Arrumando os livros...</p>}
      {empty && <p className="hint">Ninguém mandou um livro para você ainda.</p>}
      {people && !empty && (
        <div className="visit">
          <nav className="people" aria-label="De quem é a estante">
            {section('Fixados', '⭐', pinned, personButton)}
            {section('Família', '👨‍👩‍👧', family, personButton)}
            {section('Amigos', '💌', friends, personButton)}
            {section('Meus grupos', '👥', groupShelves, groupButton)}
            {hidden.length > 0 && (
              <>
                <button type="button" className="people__toggle" aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
                  🙈 Escondidos ({hidden.length})
                </button>
                {showHidden && <ul>{hidden.map(personButton)}</ul>}
              </>
            )}
          </nav>
          <section className="visit__shelf" aria-label={person ? `Estante de ${person.nickname}` : group ? `Grupo ${group.name}` : undefined}>
            {person && authorShelf(person, true)}
            {group && group.people.map((p) => authorShelf(p, false))}
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
