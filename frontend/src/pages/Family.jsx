import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AVATARS, PICTURES, PICTURE_PASSWORD_LENGTH } from '../lib/constants';
import { PicturePad } from '../components/PicturePad';
import { Emoji } from '../components/Emoji';

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
            <KidRow
              key={child.id}
              child={child}
              onOpen={() => openShelf(child)}
              onRemove={() => remove(child)}
              onChange={(saved) => setChildren((list) => list.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)))}
            />
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

// Jeitos de entrar que o responsável escolhe para cada criança.
const METHOD_OPTIONS = [
  { id: 'picture', label: 'Figuras' },
  { id: 'text', label: 'Senha' },
  { id: 'both', label: 'Os dois' },
];

const usesPicture = (method) => method !== 'text';
const usesText = (method) => method !== 'picture';

function methodOf(child) {
  const methods = child?.methods ?? ['picture'];
  if (methods.includes('picture') && methods.includes('text')) return 'both';
  return methods.includes('text') ? 'text' : 'picture';
}

// has: jeitos que a criança já tem; quando já existe, deixar em branco mantém o atual.
function LoginFields({ method, onMethod, picture, onPicture, password, onPassword, has = [] }) {
  return (
    <>
      <fieldset className="field">
        <legend>Como a criança entra</legend>
        <div className="tabs" role="group">
          {METHOD_OPTIONS.map((option) => (
            <button key={option.id} type="button" className="tab" aria-pressed={method === option.id} onClick={() => onMethod(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {usesPicture(method) && (
        <fieldset className="field">
          <legend>
            {has.includes('picture')
              ? 'Novas figuras (deixe em branco para manter as de hoje)'
              : 'Senha de figuras: escolha 4 figuras junto com a criança'}
          </legend>
          <PicturePad value={picture} onChange={onPicture} />
          {picture.length === PICTURE_PASSWORD_LENGTH && (
            <p className="muted">
              Anote para não esquecer:{' '}
              {picture.map((i, n) => (
                <Emoji key={n} char={PICTURES[i]} />
              ))}
            </p>
          )}
        </fieldset>
      )}

      {usesText(method) && (
        <label className="field" htmlFor="child-text-password">
          {has.includes('text') ? 'Nova senha (deixe em branco para manter a de hoje)' : 'Senha normal (pelo menos 4 letras ou números)'}
          <input
            id="child-text-password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            autoComplete="new-password"
            maxLength={64}
          />
        </label>
      )}
    </>
  );
}

// Pronto quando cada jeito escolhido tem senha nova ou já existia.
function loginReady(method, picture, password, has = []) {
  const pictureOk = !usesPicture(method) || picture.length === PICTURE_PASSWORD_LENGTH || (picture.length === 0 && has.includes('picture'));
  const textOk = !usesText(method) || password.length >= 4 || (password.length === 0 && has.includes('text'));
  return pictureOk && textOk;
}

function loginBody(method, picture, password) {
  const body = {};
  if (!usesPicture(method)) body.picture = null;
  else if (picture.length === PICTURE_PASSWORD_LENGTH) body.picture = picture;
  if (!usesText(method)) body.password = null;
  else if (password) body.password = password;
  return body;
}

function EditLogin({ child, onCancel, onSaved }) {
  const has = child.methods ?? ['picture'];
  const [method, setMethod] = useState(methodOf(child));
  const [picture, setPicture] = useState([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { child: saved } = await api.patch(`/children/${child.id}`, loginBody(method, picture, password));
      onSaved(saved);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack kid__edit" onSubmit={submit}>
      <LoginFields
        method={method}
        onMethod={setMethod}
        picture={picture}
        onPicture={setPicture}
        password={password}
        onPassword={setPassword}
        has={has}
      />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!loginReady(method, picture, password, has) || busy}>Salvar</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function KidRow({ child, onOpen, onRemove, onChange }) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <li className="kid card">
      <span className="kid__avatar" aria-hidden="true"><Emoji char={child.avatar} /></span>
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
          <button type="button" className="btn btn--ghost" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>Senha</button>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>Apagar</button>
        </div>
      )}
      {editing && (
        <EditLogin
          child={child}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            onChange(saved);
            setEditing(false);
          }}
        />
      )}
    </li>
  );
}

function NewChild({ onCancel, onCreated }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [method, setMethod] = useState('picture');
  const [picture, setPicture] = useState([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = nickname.trim() && loginReady(method, picture, password);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { picture: pictureBody, password: passwordBody } = loginBody(method, picture, password);
      const { child } = await api.post('/children', {
        nickname: nickname.trim(),
        avatar,
        ...(pictureBody ? { picture: pictureBody } : {}),
        ...(passwordBody ? { password: passwordBody } : {}),
      });
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
              <Emoji char={a} />
            </button>
          ))}
        </div>
      </fieldset>

      <LoginFields
        method={method}
        onMethod={setMethod}
        picture={picture}
        onPicture={setPicture}
        password={password}
        onPassword={setPassword}
      />

      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!ready || busy}>Criar perfil</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
