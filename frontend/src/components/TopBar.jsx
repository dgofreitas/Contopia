import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { THEME_LIST } from '../scene/themes';
import { Emoji } from './Emoji';

/**
 * Barra da criança, igual em todas as telas: à esquerda o mapa com os lugares
 * do app; à direita a paleta de temas e quem está usando (com o "Sair").
 * drafts e shared são as contagens do mapa; a página que já as tem passa aqui,
 * as outras deixam a barra buscar.
 */
export function TopBar({ drafts, shared }) {
  const counts = useNavCounts({ drafts, shared });
  return (
    <header className="topbar">
      <MapMenu counts={counts} />
      <div className="topbar__right">
        <ThemePalette />
        <AvatarMenu />
      </div>
    </header>
  );
}

function useNavCounts({ drafts, shared }) {
  const given = drafts !== undefined && shared !== undefined;
  const [fetched, setFetched] = useState({ drafts: 0, shared: 0 });
  useEffect(() => {
    if (given) return;
    api.get('/books').then((data) => setFetched((c) => ({ ...c, drafts: data.books.filter((b) => !b.published).length }))).catch(() => {});
    api
      .get('/books/family')
      .then((data) => setFetched((c) => ({ ...c, shared: [...data.children, ...(data.friends || [])].reduce((sum, child) => sum + child.books.length, 0) })))
      .catch(() => {});
  }, [given]);
  return { drafts: drafts ?? fetched.drafts, shared: shared ?? fetched.shared };
}

// Abre e fecha um menu; fecha ao tocar fora ou apertar Esc.
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

// Mapa: os lugares do app. A bolinha avisa quando há livros esperando no Ateliê.
function MapMenu({ counts }) {
  const { open, setOpen, ref } = usePopover();
  const places = [
    { to: '/estante', icon: '📚', label: 'Minha estante', end: true },
    { to: '/atelie', icon: '✏️', label: 'Ateliê', count: counts.drafts, hint: plural(counts.drafts, 'livro sendo escrito', 'livros sendo escritos') },
    { to: '/estante/familia', icon: '👨‍👩‍👧', label: 'Família e amigos', count: counts.shared, hint: plural(counts.shared, 'livro para ler', 'livros para ler') },
    { to: '/grupos', icon: '👥', label: 'Grupos' },
  ];
  return (
    <div className="popover" ref={ref}>
      <button
        type="button"
        className="round-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={counts.drafts > 0 ? `Mapa, ${plural(counts.drafts, 'livro sendo escrito', 'livros sendo escritos')}` : 'Mapa'}
        onClick={() => setOpen((v) => !v)}
      >
        <Emoji char="🗺️" />
        {counts.drafts > 0 && <span className="badge badge--corner" aria-hidden="true">{counts.drafts}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="map-menu"
            aria-label="Para onde vamos?"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
          >
            <p className="map-menu__title">Para onde vamos?</p>
            {places.map((place) => (
              <NavLink
                key={place.to}
                to={place.to}
                end={place.end}
                className="map-menu__place"
                aria-label={place.count > 0 ? `${place.label}, ${place.hint}` : place.label}
                onClick={() => setOpen(false)}
              >
                <span className="map-menu__icon" aria-hidden="true"><Emoji char={place.icon} /></span>
                {place.label}
                {place.count > 0 && <span className="badge" aria-hidden="true">{place.count}</span>}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

// Paleta: os temas aparecem em bolinhas grandes. Tocar numa já troca o cenário
// atrás (a tela é a prévia); a criança fecha quando gostar.
function ThemePalette() {
  const { me, setChild } = useAuth();
  const { open, setOpen, ref } = usePopover();
  const reduce = useReducedMotion();
  const current = me.child.theme;

  const choose = async (id) => {
    setChild({ ...me.child, theme: id });
    try {
      await api.patch('/auth/me/theme', { theme: id });
    } catch {
      // o tema é só preferência: se falhar, fica valendo nesta visita
    }
  };

  return (
    <div className="popover" ref={ref}>
      <button type="button" className="round-btn" aria-expanded={open} aria-haspopup="true" aria-label="Temas" onClick={() => setOpen((v) => !v)}>
        <Emoji char="🎨" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="bubbles" role="group" aria-label="Escolher tema" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bubbles__row">
              {THEME_LIST.map((theme, i) => (
                <motion.button
                  key={theme.id}
                  type="button"
                  className="bubble"
                  aria-pressed={theme.id === current}
                  onClick={() => choose(theme.id)}
                  style={{ '--b1': theme.sky[0], '--b2': theme.mid, '--b3': theme.near }}
                  initial={reduce ? false : { scale: 0, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.05, type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <span className="bubble__ball" aria-hidden="true"><Emoji char={theme.icon} /></span>
                  <span className="bubble__name">{theme.name}</span>
                </motion.button>
              ))}
            </div>
            <button type="button" className="btn btn--small btn--primary bubbles__done" onClick={() => setOpen(false)}>✓ Pronto</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quem está usando. Tocar abre o "Sair" (ou a volta para a família, quando é o responsável).
function AvatarMenu() {
  const navigate = useNavigate();
  const { me, setChild, logout } = useAuth();
  const { open, setOpen, ref } = usePopover();

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
    <div className="popover" ref={ref}>
      <button type="button" className="topbar__who" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        {me.child.nickname}
        <span className="topbar__avatar" aria-hidden="true"><Emoji char={me.child.avatar} /></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="who-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button type="button" className="btn btn--small" onClick={leave}>
              {me.role === 'parent' ? <><Emoji char="👨‍👩‍👧" /> Voltar para a família</> : <><Emoji char="🚪" /> Sair</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
