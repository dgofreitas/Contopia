import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { THEME_LIST, themeFor } from '../scene/themes';
import { Shelf } from '../components/Shelf';
import { FlyingBook } from '../components/FlyingBook';
import { TopBar } from '../components/TopBar';
import { Emoji } from '../components/Emoji';
import { PublishDialog, audienceLabel } from '../components/PublishDialog';

// Com muitos livros a estante ganha filtros, para achar os favoritos e os que está lendo.
const MANY_BOOKS = 12;
const FILTERS = [
  ['all', 'Todos'],
  ['favorites', <>★ Favoritos</>],
  ['reading', <><Emoji char="📖" /> Lendo</>],
];

export function ShelfPage() {
  const navigate = useNavigate();
  // Título do livro que acabou de ser publicado no ateliê.
  const justPublished = useLocation().state?.published;
  const { me, setChild } = useAuth();
  const theme = themeFor(me.child.theme);
  const [books, setBooks] = useState(null);
  const [writing, setWriting] = useState(0);
  // Quantos livros os irmãos e os amigos mandaram para esta criança ler.
  const [familyBooks, setFamilyBooks] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  // Livro voltando para a estante: a lombada só reaparece quando ele chega.
  const [returningId, setReturningId] = useState(null);
  const [filter, setFilter] = useState('all');
  // Livro cuja lista de quem pode ler está sendo trocada.
  const [audienceFor, setAudienceFor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Na estante só ficam os livros publicados; os que estão sendo escritos moram no ateliê.
    api
      .get('/books')
      .then((data) => {
        setBooks(data.books.filter((b) => b.published));
        setWriting(data.books.length - data.books.filter((b) => b.published).length);
      })
      .catch((err) => setError(messageFor(err)));
    api
      .get('/books/family')
      .then((data) => setFamilyBooks([...data.children, ...(data.friends || [])].reduce((sum, child) => sum + child.books.length, 0)))
      .catch(() => {});
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

  // Publicou sem querer (ou quer mexer mais): o livro sai da estante e volta para o ateliê.
  const unpublish = async (book) => {
    try {
      await api.patch(`/books/${book.id}`, { published: false });
      setSelectedId(null);
      setBooks((list) => list.filter((b) => b.id !== book.id));
      setWriting((n) => n + 1);
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const changeAudience = async (book, audience) => {
    setAudienceFor(null);
    try {
      const { book: saved } = await api.patch(`/books/${book.id}`, audience);
      setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, visibility: saved.visibility, sharedWith: saved.sharedWith, sharedGroups: saved.sharedGroups } : b)));
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const selected = books?.find((b) => b.id === selectedId);
  const shown = books?.filter((b) => filter === 'all' || (filter === 'favorites' ? b.favorite : b.progress));
  const putBack = () => {
    setReturningId(selectedId);
    setSelectedId(null);
  };
  const reading = books?.filter((b) => b.progress).sort((a, b) => new Date(b.progress.updatedAt) - new Date(a.progress.updatedAt))[0];

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar>
        {familyBooks > 0 && <Link to="/estante/familia" className="btn btn--small">👨‍👩‍👧 Família e amigos</Link>}
        <Link
          to="/atelie"
          className="btn btn--small btn--primary"
          aria-label={writing > 0 ? `Ateliê, ${writing === 1 ? '1 livro sendo escrito' : `${writing} livros sendo escritos`}` : undefined}
        >
          ✏️ Ateliê{writing > 0 && <span className="badge" aria-hidden="true">{writing}</span>}
        </Link>
      </TopBar>

      <nav className="themes" aria-label="Tema da estante">
        {THEME_LIST.map((item) => (
          <button key={item.id} type="button" className="theme-chip" aria-pressed={item.id === theme.id} onClick={() => changeTheme(item.id)}>
            <Emoji char={item.icon} /> {item.name}
          </button>
        ))}
      </nav>

      {justPublished && !selectedId && (
        <p className="continue" role="status">🎉 <strong>{justPublished}</strong> foi publicado e já está na estante!</p>
      )}

      {reading && !selectedId && (
        <button type="button" className="continue" onClick={() => navigate(`/livro/${reading.id}/ler`)}>
          🔖 Continuar lendo <strong>{reading.title}</strong>
        </button>
      )}

      {error && <p className="error error--floating" role="alert">{error}</p>}

      <section className="room__shelf" aria-label={`Estante de ${me.child.nickname}`}>
        {books === null ? (
          <p className="hint">Arrumando os livros...</p>
        ) : (
          <>
            {books.length >= MANY_BOOKS && (
              <div className="tabs shelf-filter" role="group" aria-label="Mostrar na estante">
                {FILTERS.map(([id, label]) => (
                  <button key={id} type="button" className="tab" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
                ))}
              </div>
            )}
            <Shelf books={shown} theme={theme} hiddenId={selectedId || returningId} onSelect={setSelectedId} />
            {books.length === 0 && (
              <div className="empty-shelf">
                <p className="hint">
                  {writing > 0 ? 'Quando você terminar um livro no ateliê, ele vem morar aqui.' : 'Sua estante está vazia. Que tal escrever o primeiro livro?'}
                </p>
                <Link to="/atelie" className="btn btn--primary">✏️ Ir para o ateliê</Link>
              </div>
            )}
            {books.length > 0 && shown.length === 0 && <p className="hint">Nenhum livro aqui ainda.</p>}
          </>
        )}
      </section>

      <AnimatePresence onExitComplete={() => setReturningId(null)}>
        {selected && (
          <motion.div
            key={selected.id}
            className="overlay"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={putBack}
            onKeyDown={(e) => e.key === 'Escape' && putBack()}
          >
            {/* Só o fundo escurece com fade; o livro fica sempre visível enquanto voa */}
            <motion.div className="overlay__backdrop" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.35, duration: 0.5 } }} />
            <div onClick={(e) => e.stopPropagation()}>
              <FlyingBook book={selected} author={me.child.nickname} gold={theme.gold} />
            </div>
            <motion.div
              className="overlay__actions"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.75 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <button type="button" className="btn btn--primary" onClick={() => navigate(`/livro/${selected.id}/ler`)} autoFocus>
                📖 {selected.progress ? 'Continuar lendo' : 'Ler'}
              </button>
              <button type="button" className="btn" onClick={() => navigate(`/livro/${selected.id}/escrever`)}>✏️ Escrever</button>
              <button type="button" className="btn" aria-pressed={selected.favorite} onClick={() => toggleFavorite(selected)}>
                {selected.favorite ? '★ Favorito' : '☆ Favoritar'}
              </button>
              <button type="button" className="btn" onClick={() => setAudienceFor(selected)} aria-label={`Quem pode ler: ${audienceLabel(selected)}`}>
                {audienceLabel(selected)}
              </button>
              <button type="button" className="btn" onClick={() => unpublish(selected)}>↩️ Voltar para o ateliê</button>
              <button type="button" className="btn btn--ghost-light" onClick={putBack}>Guardar na estante</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {audienceFor && (
          <PublishDialog
            title={audienceFor.title}
            heading={`Quem pode ler “${audienceFor.title}”?`}
            initial={{ visibility: audienceFor.visibility, sharedWith: audienceFor.sharedWith, sharedGroups: audienceFor.sharedGroups }}
            confirmLabel="Salvar"
            onPublish={(audience) => changeAudience(audienceFor, audience)}
            onClose={() => setAudienceFor(null)}
          />
        )}
      </AnimatePresence>

    </main>
  );
}
