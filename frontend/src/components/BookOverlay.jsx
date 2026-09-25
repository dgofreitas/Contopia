import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * O livro tirado da estante. Primeiro aparece a capa; "Abrir" gira a capa em 3D
 * como um livro de verdade e mostra a primeira página.
 */
export function BookOverlay({ book, onClose }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={book.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`book-${book.id}`}
        className="book"
        style={{ '--book': book.color }}
        onClick={(event) => event.stopPropagation()}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      >
        <div className="book__page">
          <p className="book__chapter">Capítulo 1</p>
          <p>Era uma vez uma história que ainda está sendo escrita...</p>
        </div>
        <motion.div
          className="book__cover"
          animate={{ rotateY: open ? -165 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 16 }}
        >
          <h2 className="book__title">{book.title}</h2>
          <p className="book__author">por {book.author}</p>
        </motion.div>
      </motion.div>

      <div className="overlay__actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="btn btn--primary" onClick={() => setOpen((value) => !value)}>
          {open ? 'Fechar a capa' : 'Abrir o livro'}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Guardar na estante
        </button>
      </div>
    </motion.div>
  );
}
