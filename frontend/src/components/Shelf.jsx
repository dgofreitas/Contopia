import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Emoji } from './Emoji';

// Altura da lombada varia um pouco por livro, para a estante não parecer uma régua.
const heightFor = (id) => 176 + (parseInt(id.slice(-4), 16) % 40);

// Largura de cada lombada mais o espaço entre elas (ver .shelf__slot e .shelf__books),
// e o que sobra para as margens da prateleira e o aparador de livros.
// No celular os livros ficam menores para caber mais em cada prateleira.
const NORMAL = { slot: 58, side: 90, scale: 1 };
const COMPACT = { slot: 44, side: 64, scale: 0.8 };

// Quantos livros cabem numa prateleira nesta largura de tela.
function usePerShelf() {
  const ref = useRef(null);
  const [layout, setLayout] = useState({ perShelf: 14, size: NORMAL });

  useLayoutEffect(() => {
    const measure = () => {
      const width = ref.current?.clientWidth;
      if (!width) return;
      const size = width < 560 ? COMPACT : NORMAL;
      const perShelf = Math.max(3, Math.floor((width - size.side) / size.slot));
      setLayout((old) => (old.perShelf === perShelf && old.size === size ? old : { perShelf, size }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, layout];
}

/**
 * Estante com prateleiras de madeira empilhadas: quando os livros não cabem numa
 * prateleira, começa outra embaixo. Aqui só ficam os livros publicados: livro
 * novo se cria no ateliê. A lombada do livro que está fora da estante (hiddenId)
 * continua ocupando o lugar, invisível, para o livro saber para onde voltar.
 */
export function Shelf({ books, theme, hiddenId, onSelect }) {
  const reduce = useReducedMotion();
  const [ref, { perShelf, size }] = usePerShelf();

  const shelves = [];
  for (let i = 0; i < books.length; i += perShelf) shelves.push(books.slice(i, i + perShelf));
  // Estante vazia ainda mostra uma prateleira, esperando o primeiro livro.
  if (shelves.length === 0) shelves.push([]);

  return (
    <div
      ref={ref}
      className={`bookcase${size === COMPACT ? ' bookcase--compact' : ''}`}
      style={{ '--per': perShelf, '--wood-l': theme.wood[0], '--wood-d': theme.wood[1], '--wood-dd': theme.wood[2], '--gold': theme.gold }}
    >
      {shelves.map((row, r) => (
        <div key={r} className="shelf">
          <ul className={`shelf__books${shelves.length > 1 ? ' shelf__books--full' : ''}`} aria-label={shelves.length > 1 ? `Prateleira ${r + 1}` : 'Livros na estante'}>
            {row.map((book, i) => {
              const index = r * perShelf + i;
              const height = Math.round(heightFor(book.id) * size.scale);
              const out = hiddenId === book.id;
              return (
                <li key={book.id} className="shelf__slot" style={{ height }}>
                  <motion.button
                    type="button"
                    data-spine={book.id}
                    className="spine"
                    style={{ '--c': book.cover.color, height, visibility: out ? 'hidden' : 'visible' }}
                    onClick={() => onSelect(book.id)}
                    aria-hidden={out || undefined}
                    tabIndex={out ? -1 : undefined}
                    aria-label={`${book.title}${book.favorite ? ', favorito' : ''}${book.progress ? ', lendo' : ''}`}
                    initial={reduce ? false : { y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: reduce ? 0 : Math.min(index, 16) * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                    whileHover={reduce ? undefined : { y: -16, rotate: -3 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="spine__title">{book.title}</span>
                    {book.cover.sticker && <span className="spine__sticker" aria-hidden="true"><Emoji char={book.cover.sticker} /></span>}
                    {book.progress && <i className="spine__ribbon" aria-hidden="true" />}
                    {book.favorite && <i className="spine__star" aria-hidden="true">★</i>}
                  </motion.button>
                </li>
              );
            })}
            {r === shelves.length - 1 && <li className="shelf__bookend" aria-hidden="true" />}
          </ul>
          <div className="shelf__board" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
