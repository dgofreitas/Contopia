import { motion, useReducedMotion } from 'motion/react';

// Altura da lombada varia um pouco por livro, para a estante não parecer uma régua.
const heightFor = (id) => 176 + (parseInt(id.slice(-4), 16) % 40);

/**
 * Prateleira de madeira com os livros em pé. A lombada compartilha o layoutId
 * com a capa aberta (BookOverlay), então o Motion anima o livro saindo da
 * estante até o centro e voltando para o mesmo lugar.
 */
export function Shelf({ books, theme, selectedId, onSelect, onNew }) {
  const reduce = useReducedMotion();

  return (
    <div className="shelf" style={{ '--wood-l': theme.wood[0], '--wood-d': theme.wood[1], '--wood-dd': theme.wood[2], '--gold': theme.gold }}>
      <ul className="shelf__books" aria-label="Livros na estante">
        {books.map((book, index) => {
          const height = heightFor(book.id);
          return (
            <li key={book.id} className="shelf__slot" style={{ height }}>
              {selectedId !== book.id && (
                <motion.button
                  type="button"
                  layoutId={`book-${book.id}`}
                  className="spine"
                  style={{ '--c': book.cover.color, height }}
                  onClick={() => onSelect(book.id)}
                  aria-label={`${book.title}${book.favorite ? ', favorito' : ''}${book.progress ? ', lendo' : ''}`}
                  initial={reduce ? false : { y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: reduce ? 0 : index * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                  whileHover={reduce ? undefined : { y: -16, rotate: -3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="spine__title">{book.title}</span>
                  {book.cover.sticker && <span className="spine__sticker" aria-hidden="true">{book.cover.sticker}</span>}
                  {book.progress && <i className="spine__ribbon" aria-hidden="true" />}
                  {book.favorite && <i className="spine__star" aria-hidden="true">★</i>}
                </motion.button>
              )}
            </li>
          );
        })}
        <li className="shelf__slot" style={{ height: 160 }}>
          <motion.button type="button" className="spine spine--new" onClick={onNew} whileHover={reduce ? undefined : { y: -10 }} aria-label="Criar um livro novo">
            <span className="spine__plus" aria-hidden="true">+</span>
            <span className="spine__title">Livro novo</span>
          </motion.button>
        </li>
      </ul>
      <div className="shelf__board" aria-hidden="true" />
    </div>
  );
}
