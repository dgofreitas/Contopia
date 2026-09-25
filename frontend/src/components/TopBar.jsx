import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

// Barra da criança: quem está usando e como sair.
export function TopBar({ children }) {
  const navigate = useNavigate();
  const { me, setChild, logout } = useAuth();

  const leave = async () => {
    if (me.role === 'parent') {
      await api.post('/auth/switch', { childId: null });
      setChild(null);
      navigate('/familia');
    } else {
      await logout();
      navigate('/');
    }
  };

  return (
    <header className="topbar">
      <span className="topbar__who">
        <span className="topbar__avatar" aria-hidden="true">{me.child.avatar}</span>
        {me.child.nickname}
      </span>
      <div className="row">
        {children}
        <button type="button" className="btn btn--small" onClick={leave}>
          {me.role === 'parent' ? 'Voltar para a família' : 'Sair'}
        </button>
      </div>
    </header>
  );
}
