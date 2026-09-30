import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PICTURE_PASSWORD_LENGTH } from '../lib/constants';
import { Emoji } from '../components/Emoji';
import { PicturePad } from '../components/PicturePad';
import { Scene } from '../scene/Scene';
import { THEMES } from '../scene/themes';

const CODE_KEY = 'contopia-familia';

function readSavedCode() {
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch {
    return '';
  }
}

// Três passos: código da família, quem é você, senha (de figuras ou normal).
export function ChildLogin() {
  const navigate = useNavigate();
  const { setMe } = useAuth();
  const [code, setCode] = useState(readSavedCode);
  const [children, setChildren] = useState(null);
  const [child, setChild] = useState(null);
  const [picture, setPicture] = useState([]);
  const [method, setMethod] = useState('picture');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const findFamily = async (event) => {
    event?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { children: list } = await api.get(`/auth/family/${encodeURIComponent(code.trim())}`);
      setChildren(list);
      try {
        localStorage.setItem(CODE_KEY, code.trim().toUpperCase());
      } catch {
        // sem armazenamento, a criança digita o código de novo da próxima vez
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const chooseChild = (c) => {
    setChild(c);
    // Perfis antigos não informam o jeito de entrar: eram todos com figuras.
    setMethod(c.methods?.includes('picture') === false ? 'text' : 'picture');
  };

  const forgetChild = () => {
    setChild(null);
    setPicture([]);
    setPassword('');
    setError('');
  };

  const login = useCallback(
    (secret) => {
      setBusy(true);
      setError('');
      api
        .post('/auth/child/login', { familyCode: code.trim(), childId: child.id, ...secret })
        .then((me) => {
          setMe(me);
          navigate('/estante', { replace: true });
        })
        .catch((err) => {
          setError(messageFor(err));
          setPicture([]);
          setPassword('');
        })
        .finally(() => setBusy(false));
    },
    [child, code, navigate, setMe],
  );

  useEffect(() => {
    if (picture.length === PICTURE_PASSWORD_LENGTH && child) login({ picture });
  }, [picture, child, login]);

  const methods = child?.methods ?? ['picture'];

  return (
    <main className="room room--center">
      <Scene theme={THEMES.fadas} />
      <div className="paper form">
        <Link to="/" className="back">← Voltar</Link>

        {!children && (
          <form onSubmit={findFamily} className="stack">
            <h1 className="form__title">Qual é o código da sua família?</h1>
            <p className="muted">Um adulto encontra o código na página da família.</p>
            <label className="field" htmlFor="family-code">
              Código
              <input
                id="family-code"
                className="input--code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={20}
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" className="btn btn--primary" disabled={busy || code.trim().length < 4}>Continuar</button>
          </form>
        )}

        {children && !child && (
          <div className="stack">
            <h1 className="form__title">Quem é você?</h1>
            {children.length === 0 && <p className="muted">Essa família ainda não tem perfis. Peça a um adulto para criar o seu.</p>}
            <div className="profiles">
              {children.map((c) => (
                <button key={c.id} type="button" className="profile" onClick={() => chooseChild(c)}>
                  <span className="profile__avatar" aria-hidden="true"><Emoji char={c.avatar} /></span>
                  {c.nickname}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => setChildren(null)}>Trocar o código</button>
          </div>
        )}

        {child && (
          <div className="stack">
            <h1 className="form__title">
              <Emoji char={child.avatar} /> Oi, {child.nickname}!
            </h1>
            {methods.length > 1 && (
              <div className="tabs" role="group" aria-label="Como você quer entrar">
                <button type="button" className="tab" aria-pressed={method === 'picture'} onClick={() => { setMethod('picture'); setError(''); }}>
                  Figuras
                </button>
                <button type="button" className="tab" aria-pressed={method === 'text'} onClick={() => { setMethod('text'); setError(''); }}>
                  Senha
                </button>
              </div>
            )}
            {method === 'picture' ? (
              <>
                <p className="muted">Toque nas suas 4 figuras secretas, na ordem certa.</p>
                <PicturePad value={picture} onChange={setPicture} disabled={busy} />
              </>
            ) : (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  login({ password });
                }}
              >
                <label className="field" htmlFor="child-password">
                  Sua senha
                  <input
                    id="child-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                  />
                </label>
                <button type="submit" className="btn btn--primary" disabled={busy || !password}>Entrar</button>
              </form>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <button type="button" className="btn btn--ghost" onClick={forgetChild}>
              Não sou {child.nickname}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
