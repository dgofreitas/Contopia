import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { themeFor } from '../scene/themes';
import { Scene } from '../scene/Scene';
import { BookCover } from '../components/BookCover';

const GAP = 48;

/**
 * Leitura em páginas. O capítulo é diagramado em colunas CSS do tamanho de uma
 * página; virar a página é deslizar para a próxima coluna. Em tela larga
 * aparecem duas páginas lado a lado, como um livro aberto.
 */
export function Reader() {
  const { id } = useParams();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const reduce = useReducedMotion();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [layout, setLayout] = useState({ width: 0, spread: 1 });
  const [flip, setFlip] = useState(null);
  const viewport = useRef(null);
  const flow = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api
      .get(`/books/${id}`)
      .then(({ book: loaded }) => {
        setBook(loaded);
        if (loaded.progress) {
          setChapter(loaded.progress.chapter);
          setPage(loaded.progress.page);
          setOpened(true);
        }
      })
      .catch((err) => setError(messageFor(err)));
  }, [id]);

  // Mede a área de leitura: uma página em telas estreitas, duas nas largas.
  useLayoutEffect(() => {
    if (!opened || !viewport.current) return undefined;
    const measure = () => {
      const total = viewport.current.clientWidth;
      const spread = total >= 900 ? 2 : 1;
      setLayout({ width: (total - GAP * (spread - 1)) / spread, spread });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [opened]);

  // Conta quantas páginas o capítulo ocupou.
  useLayoutEffect(() => {
    if (!flow.current || !layout.width) return;
    const count = Math.max(1, Math.round((flow.current.scrollWidth + GAP) / (layout.width + GAP)));
    setPageCount(count);
    // Em duas páginas, o livro sempre abre numa página par (esquerda).
    setPage((p) => Math.floor(Math.min(p, count - 1) / layout.spread) * layout.spread);
  }, [layout, chapter, book]);

  const saveProgress = useCallback(
    (nextChapter, nextPage) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.put(`/books/${id}/progress`, { chapter: nextChapter, page: nextPage }).catch(() => {});
      }, 600);
    },
    [id],
  );

  useEffect(() => {
    if (opened && book) saveProgress(chapter, page);
  }, [opened, book, chapter, page, saveProgress]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const lastChapter = (book?.chapters.length || 1) - 1;
  const atEnd = chapter === lastChapter && page + layout.spread >= pageCount;
  const atStart = chapter === 0 && page === 0;

  const turn = useCallback(
    (direction) => {
      if (direction > 0) {
        if (page + layout.spread < pageCount) setPage(page + layout.spread);
        else if (chapter < lastChapter) {
          setChapter(chapter + 1);
          setPage(0);
        } else return;
      } else if (page > 0) setPage(Math.max(0, page - layout.spread));
      else if (chapter > 0) {
        setChapter(chapter - 1);
        setPage(Number.MAX_SAFE_INTEGER);
      } else return;
      if (!reduce) setFlip({ direction, key: Date.now() });
    },
    [page, pageCount, chapter, lastChapter, layout.spread, reduce],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (!opened) return;
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, turn]);

  if (error) {
    return (
      <main className="desk">
        <p className="error" role="alert">{error}</p>
        <Link to="/estante" className="btn">Voltar para a estante</Link>
      </main>
    );
  }
  if (!book) return <main className="desk"><p className="muted">Abrindo o livro...</p></main>;

  const current = book.chapters[chapter];
  const isEmpty = !current.html || current.html === '<p></p>';

  return (
    <main className="room reading" style={{ '--ink': theme.ink, '--gold': theme.gold, '--c': book.cover.color }}>
      <Scene theme={theme} />
      <header className="topbar">
        <Link to="/estante" className="btn btn--small">← Estante</Link>
        <span className="reading__title">{book.title}</span>
        <Link to={`/livro/${id}/escrever`} className="btn btn--small">✏️ Escrever</Link>
      </header>

      {!opened ? (
        <div className="reading__closed">
          <motion.div className="reading__cover" initial={{ rotateY: 0 }} exit={{ rotateY: -120 }}>
            <BookCover title={book.title} author={me.child.nickname} color={book.cover.color} sticker={book.cover.sticker} gold={theme.gold} size="lg" />
          </motion.div>
          <button type="button" className="btn btn--primary btn--big" onClick={() => setOpened(true)} autoFocus>📖 Abrir o livro</button>
        </div>
      ) : (
        <div className="book-open">
          <div className="book-open__pages">
            <div className="book-open__viewport" ref={viewport}>
            <div
              ref={flow}
              className="book-open__flow"
              style={{
                columnWidth: `${layout.width}px`,
                columnGap: `${GAP}px`,
                transform: `translateX(-${page * (layout.width + GAP)}px)`,
              }}
            >
              <h2 className="book-open__chapter">{current.title || `Capítulo ${chapter + 1}`}</h2>
              {isEmpty ? (
                <p className="muted">Este capítulo ainda está em branco. Que tal escrever?</p>
              ) : (
                // HTML limpo pelo servidor (sanitize-html) antes de ser salvo
                <div className="book-open__text" dangerouslySetInnerHTML={{ __html: current.html }} />
              )}
              {chapter === lastChapter && <p className="book-open__end">Fim</p>}
            </div>
            </div>
            <AnimatePresence>
              {flip && (
                <motion.div
                  key={flip.key}
                  className={`leaf leaf--${flip.direction > 0 ? 'next' : 'prev'}`}
                  initial={{ rotateY: 0, opacity: 1 }}
                  animate={{ rotateY: flip.direction > 0 ? -180 : 180, opacity: 0.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                  onAnimationComplete={() => setFlip(null)}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
          </div>
          <nav className="book-open__nav" aria-label="Páginas">
            <button type="button" className="page-btn" onClick={() => turn(-1)} disabled={atStart} aria-label="Página anterior">‹</button>
            <span className="book-open__where">
              {book.chapters.length > 1 && <>Capítulo {chapter + 1} de {book.chapters.length} · </>}
              Página {Math.min(page + 1, pageCount)} de {pageCount}
            </span>
            <button type="button" className="page-btn" onClick={() => turn(1)} disabled={atEnd} aria-label="Próxima página">›</button>
          </nav>
        </div>
      )}
    </main>
  );
}
