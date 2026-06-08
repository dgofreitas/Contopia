// Contopia — ParentNavbar Component
// Distinct neutral blue/white design — no child UI elements
// NFR-PRV-05: No marketing or promotional content
import { useNavigate, useLocation } from 'react-router-dom';
import { HiChartBar, HiDownload, HiTrash, HiShieldCheck, HiLogout } from 'react-icons/hi';
import useParentAuthStore from '../../stores/parent-auth-store';
import useParentAuth from '../../hooks/useParentAuth';

const NAV_ITEMS = [
  { path: '/parent/dashboard', label: 'Activity', icon: HiChartBar, tab: 'activity' },
  { path: '/parent/dashboard/export', label: 'Export', icon: HiDownload, tab: 'export' },
  { path: '/parent/dashboard/delete', label: 'Delete', icon: HiTrash, tab: 'delete' },
  { path: '/parent/dashboard/privacy', label: 'Privacy', icon: HiShieldCheck, tab: 'privacy' },
];

export default function ParentNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const { logout } = useParentAuth();

  const isActive = (path) =>
    location.pathname === path || (path !== '/parent/dashboard' && location.pathname.startsWith(path));

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700" role="banner">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        aria-label="Parent dashboard navigation"
      >
        <div className="flex items-center justify-between h-16">
          {/* Brand + greeting */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-slate-100 tracking-tight select-none">
              Contopia Parent
            </span>
            {parentUser && (
              <span className="text-sm text-slate-400 hidden sm:inline">
                {parentUser.email}
              </span>
            )}
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                  isActive(path)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                aria-current={isActive(path) ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </button>
            ))}
            <div className="ml-3 pl-3 border-l border-slate-600">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors min-h-[44px]"
                aria-label="Log out of parent account"
              >
                <HiLogout className="w-4 h-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav — horizontal scroll */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                isActive(path)
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              aria-current={isActive(path) ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors min-h-[44px]"
            aria-label="Log out of parent account"
          >
            <HiLogout className="w-4 h-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}