import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ParentProtectedRoute from '../../components/parent/ParentProtectedRoute';
import ChildAvatar from '../../components/parent/ChildAvatar';
import ActivitySummaryCards from '../../components/parent/ActivitySummaryCards';
import ActivityBookGrid from '../../components/parent/ActivityBookGrid';
import PrivacyNoticeBanner from '../../components/parent/PrivacyNoticeBanner';
import ActivityEmptyState from '../../components/parent/ActivityEmptyState';
import ExportDataPanel from '../../components/parent/ExportDataPanel';
import DeleteAccountPanel from '../../components/parent/DeleteAccountPanel';
import DeletionLockedBanner from '../../components/parent/DeletionLockedBanner';
import PrivacyPolicyPage from '../../components/parent/PrivacyPolicyPage';
import useParentAuth from '../../hooks/useParentAuth';
import useParentAuthStore from '../../stores/parent-auth-store';
import useParentDashboard from '../../hooks/useParentDashboard';
import useActivitySummary from '../../hooks/useActivitySummary';
import useActivityBooks from '../../hooks/useActivityBooks';
import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../../lib/parent-api-client';
import { Button, Spinner, Alert } from 'flowbite-react';
import { HiMenu, HiX, HiChartBar, HiDownload, HiTrash, HiShieldCheck, HiLogout, HiPlus, HiUser } from 'react-icons/hi';

const NAV_ITEMS = [
  { path: '/parent/dashboard', label: 'Activity', icon: HiChartBar },
  { path: '/parent/dashboard/export', label: 'Export', icon: HiDownload },
  { path: '/parent/dashboard/delete', label: 'Delete', icon: HiTrash },
  { path: '/parent/dashboard/privacy', label: 'Privacy', icon: HiShieldCheck },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Há ${diffD}d`;
  return `Há ${Math.floor(diffD / 30)} meses`;
}

function useDeletionStatus() {
  const parentToken = useParentAuthStore((s) => s.parentToken);

  return useQuery({
    queryKey: ['parent-deletion-status'],
    queryFn: async () => {
      try {
        const { data } = await parentApiClient.get('/deletion-request/status');
        return data;
      } catch {
        return { data: { hasPendingDeletion: false } };
      }
    },
    enabled: !!parentToken,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

function ActivityTab() {
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const { data: summaryData, isLoading: summaryLoading } = useActivitySummary();
  const { data: booksData, isLoading: booksLoading } = useActivityBooks({ limit: 20, offset: 0 });
  const isLoading = summaryLoading || booksLoading;

  const summary = summaryData?.data;
  const books = booksData?.data?.books ?? [];
  const childFirstName = summary?.childFirstName || parentUser?.childFirstName || '';
  const hasActivity = summary?.hasActivity;

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Resumo de Atividade
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner aria-label="Loading activity data" />
        </div>
      ) : hasActivity === false ? (
        <ActivityEmptyState childFirstName={childFirstName} />
      ) : (
        <div className="space-y-6">
          <ActivitySummaryCards
            booksWritten={summary?.booksWritten ?? 0}
            booksRead={summary?.booksRead ?? 0}
            readingTimeMinutes={summary?.readingTimeMinutes ?? 0}
            childFirstName={childFirstName}
          />
          <PrivacyNoticeBanner childFirstName={childFirstName} />
          {books.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-slate-700 mb-3">Livros</h3>
              <ActivityBookGrid books={books} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ExportTab({ childFirstName }) {
  return <ExportDataPanel childFirstName={childFirstName} />;
}

function DeleteTab({ childFirstName, childId, deletionPending }) {
  return (
    <DeleteAccountPanel
      childFirstName={childFirstName}
      childId={childId}
      deletionPending={deletionPending}
    />
  );
}

function IdleWarningBanner({ isIdle, idleTime, onContinue }) {
  if (!isIdle) return null;

  return (
    <Alert
      color="warning"
      className="mb-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span>
          Your session has been idle for {idleTime + 25} minute{idleTime + 25 !== 1 ? 's' : ''}.
          You will be logged out after 30 minutes of inactivity.
        </span>
        <Button size="xs" color="warning" onClick={onContinue}>
          Continue Session
        </Button>
      </div>
    </Alert>
  );
}

function SidebarSection({ children, title }) {
  return (
    <div className="mb-6">
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function ChildList({ children: childrenList }) {
  if (!childrenList || childrenList.length === 0) return null;

  return (
    <ul className="space-y-1" aria-label="Children list">
      {childrenList.map((child) => {
        const lastActivity = formatRelativeTime(child.createdAt);
        return (
          <li
            key={child.childId}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <ChildAvatar firstName={child.firstName} avatarSeed={child.childId} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{child.firstName}</p>
              {lastActivity ? (
                <p className="text-xs text-slate-400 truncate">{lastActivity}</p>
              ) : (
                <p className="text-xs text-slate-500 italic">Sem atividade</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ onAddChild }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="dashboard-empty-state">
      <div className="w-28 h-28 bg-amber-50 rounded-full flex items-center justify-center mb-6 ring-4 ring-amber-100">
        <span className="text-5xl" aria-hidden="true">&#127775;</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Bem-vindo ao painel dos pais!
      </h2>
      <p className="text-slate-500 mb-8 max-w-md">
        Você ainda não cadastrou nenhum filho.
      </p>
      <Button
        color="amber"
        size="lg"
        onClick={onAddChild}
        className="shadow-md hover:shadow-lg transition-shadow"
        aria-label="Adicionar primeiro filho"
      >
        <HiPlus className="mr-2 h-5 w-5" aria-hidden="true" />
        Adicionar primeiro filho
      </Button>
    </div>
  );
}

function ParentDashboardLayout() {
  const { isIdle, idleTime, continueParentSession, logout } = useParentAuth();
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const { data: deletionStatusData } = useDeletionStatus();
  const { data: dashboardData, isLoading: dashboardLoading } = useParentDashboard();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deletionPending = deletionStatusData?.data?.hasPendingDeletion ?? false;
  const childFirstName = parentUser?.childFirstName || '';
  const childId = parentUser?.childId || '';

  const children = dashboardData?.data?.children || [];
  const parentEmail = dashboardData?.data?.email || parentUser?.email || '';
  const hasChildren = children.length > 0;

  useEffect(() => {
    if (parentToken && !parentUser?.dashNav) {
      import('../../lib/parent-api-client.js').then(({ default: api }) => {
        api.get('/me').then(({ data }) => {
          const result = data.data;
          useParentAuthStore.getState().setParentUser({
            parentId: result.parentId,
            email: result.email,
            childId: result.childId,
            childFirstName: result.childFirstName,
            dashNav: result.dashNav,
          });
        }).catch(() => {});
      });
    }
  }, [parentToken, parentUser?.dashNav]);

  const isActive = useCallback((path) =>
    location.pathname === path || (path !== '/parent/dashboard' && location.pathname.startsWith(path)),
    [location.pathname],
  );

  const handleAddChild = useCallback(() => {
    navigate('/register');
  }, [navigate]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  if (dashboardLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner aria-label="Loading dashboard" size="xl" />
      </div>
    );
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-5 pb-4 md:pt-6">
        <span className="text-lg font-semibold text-slate-100 tracking-tight select-none">
          Contopia Parent
        </span>
        <button
          type="button"
          onClick={closeSidebar}
          className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label="Close sidebar"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      {parentEmail && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <HiUser className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{parentEmail}</span>
          </div>
        </div>
      )}

      <SidebarSection title="Children">
        {hasChildren ? (
          <ChildList children={children} />
        ) : (
          <p className="text-xs text-slate-500 italic px-3">No children yet</p>
        )}
      </SidebarSection>

      <nav className="flex-1 px-2" aria-label="Parent dashboard navigation">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => { navigate(path); closeSidebar(); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isActive(path)
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                aria-current={isActive(path) ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-2 pb-4 mt-auto">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors min-h-[44px]"
          aria-label="Log out of parent account"
        >
          <HiLogout className="w-5 h-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - desktop always visible, mobile toggleable */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Parent dashboard sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header with hamburger */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="text-slate-600 hover:text-slate-800 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Open sidebar navigation"
            aria-expanded={sidebarOpen}
            aria-controls="parent-sidebar"
          >
            <HiMenu className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold text-slate-800 tracking-tight select-none">
            Contopia Parent
          </span>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" id="parent-dashboard-main">
          <IdleWarningBanner
            isIdle={isIdle}
            idleTime={idleTime}
            onContinue={continueParentSession}
          />
          {deletionPending && <DeletionLockedBanner />}
          {hasChildren ? (
            <Routes>
              <Route index element={<ActivityTab />} />
              <Route path="export" element={<ExportTab childFirstName={childFirstName} />} />
              <Route path="delete" element={<DeleteTab childFirstName={childFirstName} childId={childId} deletionPending={deletionPending} />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
            </Routes>
          ) : (
            <EmptyState onAddChild={handleAddChild} />
          )}
        </main>

        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Contopia Parent Dashboard · COPPA Compliant
        </footer>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  return (
    <ParentProtectedRoute>
      <ParentDashboardLayout />
    </ParentProtectedRoute>
  );
}