import { motion } from 'motion/react';

// Na hora de publicar, a criança escolhe quem pode ler o livro.
export const AUDIENCES = [
  ['private', '🔒', 'Só eu', 'O livro fica na sua estante e só você lê.'],
  ['family', '👨‍👩‍👧', 'Minha família', 'Seus irmãos também podem ler, na estante da família.'],
];

export function PublishDialog({ title, onPublish, onClose }) {
  return (
    <motion.div className="overlay" role="dialog" aria-modal="true" aria-label="Publicar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="paper publish"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        initial={{ y: 40, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.95 }}
      >
        <h2 className="form__title">📚 Publicar “{title}”</h2>
        <p className="muted">Quem pode ler?</p>
        <div className="audiences">
          {AUDIENCES.map(([id, icon, label, hint], i) => (
            <button key={id} type="button" className="audience" onClick={() => onPublish(id)} autoFocus={i === 0}>
              <span className="audience__icon" aria-hidden="true">{icon}</span>
              <strong>{label}</strong>
              <span className="muted">{hint}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Ainda não</button>
      </motion.div>
    </motion.div>
  );
}
