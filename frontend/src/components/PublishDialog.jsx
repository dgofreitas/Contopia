import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { FriendPicker } from './FriendPicker';

// Na hora de publicar (ou depois, na estante), a criança escolhe quem pode ler o livro.
export const AUDIENCES = [
  ['private', '🔒', 'Só eu', 'O livro fica na sua estante e só você lê.'],
  ['family', '👨‍👩‍👧', 'Minha família', 'Seus irmãos também podem ler, na estante da família.'],
  ['people', '💌', 'Amigos escolhidos', 'Você escolhe amigos ou grupos de amigos das famílias amigas.'],
];

// Texto curto de quem pode ler, para o botão da estante.
export function audienceLabel(book) {
  if (book.visibility === 'family') return '👨‍👩‍👧 A família pode ler';
  if (book.visibility === 'people') {
    const groups = book.sharedGroups?.length || 0;
    const people = book.sharedWith?.length || 0;
    const parts = [groups && (groups === 1 ? '1 grupo' : `${groups} grupos`), people && (people === 1 ? '1 amigo' : `${people} amigos`)].filter(Boolean);
    return `💌 ${parts.join(' e ') || 'Amigos'} ${groups + people === 1 ? 'pode' : 'podem'} ler`;
  }
  return '🔒 Só eu leio';
}

/**
 * heading e confirmLabel mudam quando a janela serve para trocar quem lê um
 * livro que já está na estante. onPublish recebe { visibility, sharedWith, sharedGroups }.
 */
export function PublishDialog({ title, heading = `📚 Publicar “${title}”`, initial, confirmLabel = 'Publicar', onPublish, onClose }) {
  const [step, setStep] = useState(initial?.visibility === 'people' ? 'people' : 'choose');
  const [chosen, setChosen] = useState(() => new Set(initial?.sharedWith || []));
  const [chosenGroups, setChosenGroups] = useState(() => new Set(initial?.sharedGroups || []));
  const [families, setFamilies] = useState(null);
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'people' || families) return;
    const fail = (err) => setError(messageFor(err));
    api.get('/books/friends').then((data) => setFamilies(data.families)).catch(fail);
    api.get('/groups').then((data) => setGroups(data.groups)).catch(fail);
  }, [step, families]);

  const toggleGroup = (id) =>
    setChosenGroups((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Quantos amigos diferentes vão poder ler, somando os grupos e os escolhidos um por um.
  const readers = new Set(chosen);
  groups?.filter((g) => chosenGroups.has(g.id)).forEach((g) => g.members.forEach((m) => readers.add(m.id)));
  const nothing = chosen.size + chosenGroups.size === 0;

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
            {(families === null || groups === null) && !error && <p className="muted">Procurando os amigos...</p>}
            {families?.length === 0 && (
              <p className="note">Você ainda não tem famílias amigas. Peça para um adulto convidar a família do seu amigo na página da família.</p>
            )}
            {groups?.length > 0 && (
              <fieldset className="friends">
                <legend>👥 Meus grupos</legend>
                {groups.map((group) => (
                  <label key={group.id} className="friend">
                    <input type="checkbox" checked={chosenGroups.has(group.id)} onChange={() => toggleGroup(group.id)} />
                    {group.name} <span className="muted small">({group.members.length === 1 ? '1 amigo' : `${group.members.length} amigos`})</span>
                  </label>
                ))}
              </fieldset>
            )}
            {families?.length > 0 && groups?.length > 0 && <p className="muted small">Ou escolha amigos um por um:</p>}
            {families && <FriendPicker families={families} chosen={chosen} onChange={setChosen} />}
            {families?.length > 0 && <Link to="/grupos" className="small">👥 Criar ou mudar grupos</Link>}
            <div className="row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={nothing}
                onClick={() => onPublish({ visibility: 'people', sharedWith: [...chosen], sharedGroups: [...chosenGroups] })}
              >
                {confirmLabel}{!nothing && ` para ${readers.size === 1 ? '1 amigo' : `${readers.size} amigos`}`}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('choose')}>← Voltar</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
