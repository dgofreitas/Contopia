// Contopia — Navbar Component
// App navigation with child-friendly large targets + WCAG AA compliance
import { useState } from 'react';
import { Navbar as FlowbiteNavbar } from 'flowbite-react';
import { HiBookOpen, HiPencilAlt, HiCog, HiLogout, HiDocumentText } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/auth-store';
import useLogout from '../../hooks/useLogout';

export default function Navbar() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/shelf', label: t('nav.shelf', { defaultValue: 'Estante' }), icon: HiBookOpen },
    { path: '/drafts', label: t('nav.drafts', { defaultValue: 'My Drafts' }), icon: HiDocumentText },
    { path: '/editor/new', label: t('nav.editor', { defaultValue: 'Escrever' }), icon: HiPencilAlt },
    { path: '/settings', label: t('settings.title'), icon: HiCog },
  ];

  const isActive = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <FlowbiteNavbar
      fluid
      className="bg-white border-b border-gray-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-2">
        <FlowbiteNavbar.Brand
          onClick={() => navigate('/shelf')}
          className="cursor-pointer"
        >
          <span className="text-xl font-bold text-amber-500 select-none">
            Contopia
          </span>
        </FlowbiteNavbar.Brand>
        {user && (
          <span className="text-sm text-gray-500 hidden sm:inline" aria-label={t('nav.greeting', { defaultValue: 'Olá, {{name}}', name: user.childFirstName })}>
            {t('nav.greeting', { defaultValue: 'Olá, {{name}}!', name: user.childFirstName })}
          </span>
        )}
      </div>

      <FlowbiteNavbar.Toggle
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
      />

      <FlowbiteNavbar.Collapse show={mobileOpen}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <FlowbiteNavbar.Link
            key={path}
            active={isActive(path)}
            onClick={() => {
              navigate(path);
              setMobileOpen(false);
            }}
            className={`flex items-center gap-2 text-base font-medium py-2 px-3 rounded-lg transition-colors min-h-[44px] cursor-pointer ${
              isActive(path)
                ? 'text-amber-600 bg-amber-50'
                : 'text-gray-700 hover:text-amber-600 hover:bg-amber-50'
            }`}
            aria-current={isActive(path) ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            {label}
          </FlowbiteNavbar.Link>
        ))}
        <FlowbiteNavbar.Link
          onClick={() => logout()}
          disabled={isPending}
          className="flex items-center gap-2 text-base font-medium py-2 px-3 rounded-lg transition-colors min-h-[44px] text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
          aria-label={t('logout.button')}
        >
          <HiLogout className="w-5 h-5" aria-hidden="true" />
          {t('logout.button')}
        </FlowbiteNavbar.Link>
      </FlowbiteNavbar.Collapse>
    </FlowbiteNavbar>
  );
}