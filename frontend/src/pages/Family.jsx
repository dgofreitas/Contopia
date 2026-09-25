import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AVATARS, PICTURES, PICTURE_PASSWORD_LENGTH } from '../lib/constants';
import { PicturePad } from '../components/PicturePad';

// Página do responsável: código da família e perfis das crianças.
export function Family() {
  const navigate = useNavigate();
  const { me, setChild, logout } = useAuth();
  const [children, setChildren] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/children').then((data) => setChildren(data.children)).catch((err) => setError(messageFor(err)));
  }, []);

  const openShelf = async (child) => {
    try {
      const { child: active } = await api.post('/auth/switch', { childId: child.id });
      setChild(active);
      navigate('/estante');
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const remove = async (child) => {
    try {
      await api.del(`/children/${child.id}`);
      setChildren((list) => list.filter((c) => c.id !== child.id));
    } catch (err) {
      setError(messageFor(err));
    }
  };

  return (
    <main className="desk">
      <header className="desk__header">
        <h1 className="logo logo--small">Contopia</h1>
        <button type="button" className="btn btn--ghost" onClick={logout}>Sair</button>
      </header>

      <section className="card code-card">
        <div>
          <h2>Código da família</h2>
          <p className="muted">As crianças digitam este código para entrar no próprio aparelho.</p>
        </div>
        <p className="code" aria-label={`Código ${me.parent.familyCode.split('').join(' ')}`}>{me.parent.familyCode}</p>
      </section>

      <section className="stack">
        <h2>Crianças</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {children === null && <p className="muted">Carregando...</p>}
        {children?.length === 0 && !adding && <p className="muted">Crie o primeiro perfil para a criança começar a escrever.</p>}
        <ul className="kids">
          {children?.map((child) => (
            <KidRow key={child.id} child={child} onOpen={() => openShelf(child)} onRemove={() => remove(child)} />
          ))}
        </ul>
        {adding ? (
          <NewChild
            onCancel={() => setAdding(false)}
            onCreated={(child) => {
              setChildren((list) => [...list, child]);
              setAdding(false);
            }}
          />
        ) : (
          children && children.length < 6 && (
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>+ Criar perfil de criança</button>
          )
        )}
      </section>
    </main>
  );
}

function KidRow({ child, onOpen, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="kid card">
      <span className="kid__avatar" aria-hidden="true">{child.avatar}</span>
      <div className="kid__info">
        <strong>{child.nickname}</strong>
        <span className="muted">{child.books === 1 ? '1 livro' : `${child.books} livros`}</span>
      </div>
      {confirming ? (
        <div className="kid__actions">
          <span className="error">Apagar {child.nickname} e todos os livros?</span>
          <button type="button" className="btn btn--danger" onClick={onRemove}>Apagar</button>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>Cancelar</button>
        </div>
      ) : (
        <div className="kid__actions">
          <button type="button" className="btn btn--primary" onClick={onOpen}>Abrir estante</button>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>Apagar</button>
        </div>
      )}
    </li>
  );
}

function NewChild({ onCancel, onCreated }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [picture, setPicture] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = nickname.trim() && picture.length === PICTURE_PASSWORD_LENGTH;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { child } = await api.post('/children', { nickname: nickname.trim(), avatar, picture });
      onCreated(child);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Novo perfil</h3>
      <label className="field" htmlFor="nickname">
        Apelido (aparece como autor dos livros; evite o nome completo)
        <input id="nickname" maxLength={24} value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </label>

      <fieldset className="field">
        <legend>Bichinho</legend>
        <div className="avatars">
          {AVATARS.map((a) => (
            <button key={a} type="button" className="avatar" aria-pressed={a === avatar} onClick={() => setAvatar(a)} aria-label={`Bichinho ${a}`}>
              {a}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Senha de figuras: escolha 4 figuras junto com a criança</legend>
        <PicturePad value={picture} onChange={setPicture} />
        {picture.length === PICTURE_PASSWORD_LENGTH && (
          <p className="muted">Anote para não esquecer: {picture.map((i) => PICTURES[i]).join(' ')}</p>
        )}
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!ready || busy}>Criar perfil</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
