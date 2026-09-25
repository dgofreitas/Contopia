import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

/**
 * Uma prateleira com livros em pé. Cada lombada compartilha o layoutId com a
 * capa do BookOverlay, então o Motion anima o livro saindo da estante até o
 * centro da tela e voltando para o mesmo lugar.
 */
export function Bookshelf({ books, theme, selectedId, onSelect }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="shelf" style={{ '--wood': theme.wood, '--wood-dark': theme.woodDark }}>
      <ul className="shelf__books" aria-label="Livros na estante">
        {books.map((book, index) => (
          <li key={book.id} className="shelf__slot" style={{ height: book.height }}>
            <AnimatePresence>
              {selectedId !== book.id && (
                <motion.button
                  type="button"
                  layoutId={`book-${book.id}`}
                  className="spine"
                  style={{ '--book': book.color, height: book.height }}
                  aria-label={`Abrir ${book.title}, de ${book.author}`}
                  onClick={() => onSelect(book.id)}
                  initial={reduceMotion ? false : { y: -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
                  whileHover={reduceMotion ? undefined : { y: -14, rotate: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="spine__title">{book.title}</span>
                  {book.reading && <span className="spine__ribbon" aria-label="Lendo agora" />}
                  {book.favorite && <span className="spine__star" aria-label="Favorito">★</span>}
                </motion.button>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
      <div className="shelf__board" aria-hidden="true" />
    </div>
  );
}
