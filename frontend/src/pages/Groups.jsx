import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { themeFor } from '../scene/themes';
import { Emoji } from '../components/Emoji';
import { TopBar } from '../components/TopBar';
import { FriendPicker } from '../components/FriendPicker';

/**
 * Grupos de amigos da criança. Um livro mandado para um grupo vale para quem
 * estiver nele: entrou alguém novo, ele já pode ler todos os livros do grupo.
 */
export function Groups() {
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [groups, setGroups] = useState(null);
  const [families, setFamilies] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/groups').then((data) => setGroups(data.groups)).catch((err) => setError(messageFor(err)));
    api.get('/books/friends').then((data) => setFamilies(data.families)).catch((err) => setError(messageFor(err)));
  }, []);

  const save = async ({ name, members }) => {
    setError('');
    try {
      if (editing.id) {
        const { group } = await api.patch(`/groups/${editing.id}`, { name, members });
        setGroups((list) => list.map((g) => (g.id === group.id ? group : g)));
      } else {
        const { group } = await api.post('/groups', { name, members });
        setGroups((list) => [...list, group]);
      }
      setEditing(null);
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const remove = async (group) => {
    const warning = group.books > 0 ? ` Os ${group.books === 1 ? 'livro mandado' : `${group.books} livros mandados`} para ele deixam de aparecer para esses amigos.` : '';
    if (!window.confirm(`Apagar o grupo "${group.name}"?${warning}`)) return;
    try {
      await api.del(`/groups/${group.id}`);
      setGroups((list) => list.filter((g) => g.id !== group.id));
    } catch (err) {
      setError(messageFor(err));
    }
  };

  return (
    <main className="room" style={{ '--ink': theme.ink, '--ink-soft': theme.inkSoft }}>
      <Scene theme={theme} />
      <TopBar />

      <section className="paper atelier" aria-labelledby="groups-title">
        <h1 id="groups-title" className="form__title">👥 Meus grupos</h1>
        <p className="muted">Junte amigos num grupo para mandar livros para todos de uma vez. Quem você colocar depois no grupo também lê os livros que já foram mandados para ele.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {groups === null && !error && <p className="muted">Procurando os grupos...</p>}
        {families?.length === 0 && (
          <p className="note">Você ainda não tem famílias amigas. Peça para um adulto convidar a família do seu amigo na página da família.</p>
        )}

        <ul className="groups">
          {groups?.map((group) => (
            <li key={group.id} className="group">
              <div>
                <h2 className="group__name">{group.name}</h2>
                <p className="muted small">
                  {group.members.length === 1 ? '1 amigo' : `${group.members.length} amigos`} · {group.books === 1 ? '1 livro' : `${group.books} livros`}
                </p>
                <p className="group__members">
                  {group.members.map((m) => (
                    <span key={m.id} className="chip"><Emoji char={m.avatar} /> {m.nickname}</span>
                  ))}
                </p>
              </div>
              <div className="row">
                <button type="button" className="btn btn--small" onClick={() => setEditing(group)} aria-label={`Mudar o grupo ${group.name}`}>✏️ Mudar</button>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => remove(group)} aria-label={`Apagar o grupo ${group.name}`}>🗑️ Apagar</button>
              </div>
            </li>
          ))}
        </ul>
        {families?.length > 0 && (
          <button type="button" className="btn btn--primary" onClick={() => setEditing({ name: '', members: [] })}>+ Novo grupo</button>
        )}
      </section>

      <AnimatePresence>
        {editing && families && (
          <motion.div className="overlay" role="dialog" aria-modal="true" aria-label={editing.id ? 'Mudar grupo' : 'Novo grupo'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)}>
            <motion.div className="paper publish" onClick={(e) => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
              <GroupForm group={editing} families={families} onSave={save} onCancel={() => setEditing(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function GroupForm({ group, families, onSave, onCancel }) {
  const [name, setName] = useState(group.name);
  const [chosen, setChosen] = useState(() => new Set(group.members.map((m) => m.id)));
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), members: [...chosen] }); }}>
      <h2 className="form__title">{group.id ? 'Mudar grupo' : 'Novo grupo'}</h2>
      <label className="field" htmlFor="group-name">
        Nome do grupo
        <input id="group-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Turma do 3º ano" autoFocus />
      </label>
      <p className="muted">Quem está no grupo?</p>
      <FriendPicker families={families} chosen={chosen} onChange={setChosen} />
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!name.trim()}>Salvar grupo</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
