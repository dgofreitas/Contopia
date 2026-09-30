import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { Emoji } from './Emoji';

// Na hora de publicar (ou depois, na estante), a criança escolhe quem pode ler o livro.
export const AUDIENCES = [
  ['private', '🔒', 'Só eu', 'O livro fica na sua estante e só você lê.'],
  ['family', '👨‍👩‍👧', 'Minha família', 'Seus irmãos também podem ler, na estante da família.'],
  ['people', '💌', 'Amigos escolhidos', 'Você escolhe quem lê, entre as famílias amigas.'],
];

// Texto curto de quem pode ler, para o botão da estante.
export function audienceLabel(book) {
  if (book.visibility === 'family') return '👨‍👩‍👧 A família pode ler';
  if (book.visibility === 'people') return book.sharedWith?.length === 1 ? '💌 1 amigo pode ler' : `💌 ${book.sharedWith?.length || 0} amigos podem ler`;
  return '🔒 Só eu leio';
}

/**
 * heading e confirmLabel mudam quando a janela serve para trocar quem lê um
 * livro que já está na estante. onPublish recebe { visibility, sharedWith }.
 */
export function PublishDialog({ title, heading = `📚 Publicar “${title}”`, initial, confirmLabel = 'Publicar', onPublish, onClose }) {
  const [step, setStep] = useState(initial?.visibility === 'people' ? 'people' : 'choose');
  const [chosen, setChosen] = useState(() => new Set(initial?.sharedWith || []));
  const [families, setFamilies] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'people' || families) return;
    api.get('/books/friends').then((data) => setFamilies(data.families)).catch((err) => setError(messageFor(err)));
  }, [step, families]);

  const toggle = (id) =>
    setChosen((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <motion.div className="overlay" role="dialog" aria-modal="true" aria-label="Quem pode ler" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="paper publish"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        initial={{ y: 40, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.95 }}
      >
        <h2 className="form__title">{heading}</h2>

        {step === 'choose' ? (
          <>
            <p className="muted">Quem pode ler?</p>
            <div className="audiences">
              {AUDIENCES.map(([id, icon, label, hint], i) => (
                <button
                  key={id}
                  type="button"
                  className="audience"
                  aria-pressed={initial ? initial.visibility === id : undefined}
                  onClick={() => (id === 'people' ? setStep('people') : onPublish({ visibility: id }))}
                  autoFocus={i === 0}
                >
                  <span className="audience__icon" aria-hidden="true">{icon}</span>
                  <strong>{label}</strong>
                  <span className="muted">{hint}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--ghost" onClick={onClose}>{initial ? 'Cancelar' : 'Ainda não'}</button>
          </>
        ) : (
          <>
            <p className="muted">💌 Quais amigos podem ler?</p>
            {error && <p className="error" role="alert">{error}</p>}
            {families === null && !error && <p className="muted">Procurando os amigos...</p>}
            {families?.length === 0 && (
              <p className="note">Você ainda não tem famílias amigas. Peça para um adulto convidar a família do seu amigo na página da família.</p>
            )}
            {families?.map((family) => (
              <fieldset key={family.familyName || 'sem-nome'} className="friends">
                <legend>{family.familyName ? `@${family.familyName}` : 'Família amiga'}</legend>
                {family.children.map((child) => (
                  <label key={child.id} className="friend">
                    <input type="checkbox" checked={chosen.has(child.id)} onChange={() => toggle(child.id)} />
                    <Emoji char={child.avatar} /> {child.nickname}
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={chosen.size === 0}
                onClick={() => onPublish({ visibility: 'people', sharedWith: [...chosen] })}
              >
                {confirmLabel}{chosen.size > 0 && ` para ${chosen.size === 1 ? '1 amigo' : `${chosen.size} amigos`}`}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('choose')}>← Voltar</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
