import { Emoji } from './Emoji';

// Lista para marcar crianças das famílias amigas, separadas por família.
export function FriendPicker({ families, chosen, onChange }) {
  const toggle = (id) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return families.map((family) => (
    <fieldset key={family.familyName || 'sem-nome'} className="friends">
      <legend>{family.familyName ? `@${family.familyName}` : 'Família amiga'}</legend>
      {family.children.map((child) => (
        <label key={child.id} className="friend">
          <input type="checkbox" checked={chosen.has(child.id)} onChange={() => toggle(child.id)} />
          <Emoji char={child.avatar} /> {child.nickname}
        </label>
      ))}
    </fieldset>
  ));
}
