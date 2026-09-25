import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Scene } from '../scene/Scene';
import { THEMES } from '../scene/themes';

export function ParentAuth({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { setMe } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', consent: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (isRegister && form.password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (isRegister && !form.consent) return setError('Para continuar, confirme a autorização.');
    setBusy(true);
    try {
      const me = isRegister
        ? await api.post('/auth/register', { email: form.email, password: form.password, consent: true })
        : await api.post('/auth/login', { email: form.email, password: form.password });
      setMe({ role: 'parent', ...me });
      navigate('/familia', { replace: true });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="room room--center">
      <Scene theme={THEMES.fadas} />
      <form className="paper form" onSubmit={submit} noValidate>
        <Link to="/" className="back">← Voltar</Link>
        <h1 className="form__title">{isRegister ? 'Criar a conta da família' : 'Entrar como responsável'}</h1>
        {isRegister && <p className="muted">A conta é do adulto. Depois você cria o perfil de cada criança.</p>}

        <label className="field" htmlFor="email">
          E-mail
          <input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field" htmlFor="password">
          Senha
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        {isRegister && (
          <label className="check" htmlFor="consent">
            <input id="consent" type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
            <span>Sou maior de idade, responsável pelas crianças que vou cadastrar, e autorizo o uso do Contopia por elas.</span>
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Um momento...' : isRegister ? 'Criar conta' : 'Entrar'}
        </button>
        <p className="fine">
          {isRegister ? <>Já tem conta? <Link to="/login">Entrar</Link></> : <>Ainda não tem conta? <Link to="/cadastro">Criar a conta da família</Link></>}
        </p>
      </form>
    </main>
  );
}
