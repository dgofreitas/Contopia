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
import useChildSession from '../../hooks/useChildSession';
import { Button, Spinner, Alert } from 'flowbite-react';
import { HiMenu, HiX, HiChartBar, HiDownload, HiTrash, HiShieldCheck, HiLogout, HiPlus, HiUser, HiPlay } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

// Tailwind classes for the secondary outline CTAs (amber/blue/gray) used in the
// empty states. Outlined, not solid, to signal an informational state.
const CTA_AMBER_OUTLINE = 'border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 focus:ring-amber-400';
const CTA_BLUE_OUTLINE = 'border border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-400';
const CTA_GRAY_OUTLINE = 'border border-slate-400 text-slate-700 bg-slate-50 hover:bg-slate-100 focus:ring-slate-400';

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

function ActivityTab({ hasChildren, onAddChild }) {
  const { t } = useTranslation('auth');
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const { data: summaryData, isLoading: summaryLoading } = useActivitySummary();
  const { data: booksData, isLoading: booksLoading } = useActivityBooks({ limit: 20, offset: 0 });
  const { startChildSession, isPending: isStartingSession, error: sessionError, getErrorMessage } = useChildSession();
  const isLoading = summaryLoading || booksLoading;

  const summary = summaryData?.data;
  const books = booksData?.data?.books ?? [];
  const childFirstName = summary?.childFirstName || parentUser?.childFirstName || '';
  const hasActivity = summary?.hasActivity;

  const children = summaryData?.data?.children || (childFirstName ? [{ childId: parentUser?.childId, firstName: childFirstName }] : []);
  const hasChildrenLocal = hasChildren !== undefined ? hasChildren : children.length > 0;

  // Empty state: no children registered yet — guide parent to add a dependent.
  // Warm/amber accent for a welcoming, action-oriented feel.
  if (!hasChildrenLocal && !isLoading) {
    return (
      <section aria-labelledby="activity-heading" data-testid="activity-empty-tab">
        <h2 id="activity-heading" className="text-xl font-semibold text-slate-800 mb-4">
          {t('dashboardEmptyState.activityTitle')}
        </h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border-2 border-amber-200">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-amber-100">
            <span className="text-4xl" aria-hidden="true">&#128218;</span>
          </div>
          <p className="text-slate-600 mb-3 max-w-md">{t('dashboardEmptyState.activityDescription')}</p>
          <p className="text-slate-500 mb-6 max-w-md text-sm">{t('dashboardEmptyState.activitySecondParagraph')}</p>
          <Button
            onClick={onAddChild}
            className={`${CTA_AMBER_OUTLINE} w-full sm:w-auto min-h-[44px] transition-colors focus:outline-none focus:ring-2`}
            data-testid="activity-add-child-cta"
          >
            <HiPlus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t('dashboardEmptyState.activityCta')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Resumo de Atividade
      </h2>

      {hasChildrenLocal && (
        <div className="mb-6 space-y-3">
          {children.map((child) => (
            <div key={child.childId} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <ChildAvatar firstName={child.firstName} avatarSeed={child.childId} size={40} />
              <span className="text-sm font-medium text-slate-700 flex-1">{child.firstName}</span>
              <Button
                size="xs"
                color="amber"
                disabled={isStartingSession}
                onClick={() => startChildSession({ childId: child.childId })}
                aria-label={t('childSession.startSession', { name: child.firstName })}
              >
                <HiPlay className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {isStartingSession ? t('childSession.sessionStarted') : t('childSession.startSession', { name: child.firstName })}
              </Button>
            </div>
          ))}
          {sessionError && (
            <Alert color="failure" className="mt-2">
              {getErrorMessage(sessionError)}
            </Alert>
          )}
        </div>
      )}

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

function ExportTab({ childFirstName, hasChildren, onAddChild }) {
  const { t } = useTranslation('auth');

  if (hasChildren === false) {
    return (
      <section aria-labelledby="export-heading" data-testid="export-empty-tab">
        <h2 id="export-heading" className="text-xl font-semibold text-slate-800 mb-4">
          {t('dashboardEmptyState.exportTitle')}
        </h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border-2 border-blue-200">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-100">
            <HiDownload className="w-8 h-8 text-blue-500" aria-hidden="true" />
          </div>
          <p className="text-slate-600 mb-3 max-w-md">{t('dashboardEmptyState.exportDescription')}</p>
          <p className="text-slate-500 mb-6 max-w-md text-sm">{t('dashboardEmptyState.exportSecondParagraph')}</p>
          <Button
            onClick={onAddChild}
            className={`${CTA_BLUE_OUTLINE} w-full sm:w-auto min-h-[44px] transition-colors focus:outline-none focus:ring-2`}
            data-testid="export-add-child-cta"
          >
            <HiPlus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t('dashboardEmptyState.exportCta')}
          </Button>
        </div>
      </section>
    );
  }
  return <ExportDataPanel childFirstName={childFirstName} />;
}

function DeleteTab({ childFirstName, childId, deletionPending, hasChildren, onAddChild }) {
  const { t } = useTranslation('auth');

  if (hasChildren === false) {
    return (
      <section aria-labelledby="delete-heading" data-testid="delete-empty-tab">
        <h2 id="delete-heading" className="text-xl font-semibold text-slate-800 mb-4">
          {t('dashboardEmptyState.deleteTitle')}
        </h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border-2 border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-slate-200">
            <HiShieldCheck className="w-8 h-8 text-slate-500" aria-hidden="true" />
          </div>
          <p className="text-slate-600 mb-3 max-w-md">{t('dashboardEmptyState.deleteDescription')}</p>
          <p className="text-slate-500 mb-6 max-w-md text-sm">{t('dashboardEmptyState.deleteSecondParagraph')}</p>
          <Button
            onClick={onAddChild}
            className={`${CTA_GRAY_OUTLINE} w-full sm:w-auto min-h-[44px] transition-colors focus:outline-none focus:ring-2`}
            data-testid="delete-add-child-cta"
          >
            <HiPlus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t('dashboardEmptyState.deleteCta')}
          </Button>
        </div>
      </section>
    );
  }
  return (
    <DeleteAccountPanel
      childFirstName={childFirstName}
      childId={childId}
      deletionPending={deletionPending}
    />
  );
}

function IdleWarningBanner({ isIdle, idleTime, onContinue, serverDriven, secondsRemaining }) {
  if (!isIdle) return null;

  const message = serverDriven && secondsRemaining
    ? `Your session will expire in ${Math.ceil(secondsRemaining / 60)} minutes. Save your work.`
    : `Your session has been idle for ${idleTime + 25} minute${idleTime + 25 !== 1 ? 's' : ''}. You will be logged out after 30 minutes of inactivity.`;

  return (
    <Alert
      color="warning"
      className="mb-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
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

function ParentDashboardLayout() {
  const { isIdle, idleTime, continueParentSession, logout, sessionExpiring, sessionExpiringSeconds } = useParentAuth();
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const { data: deletionStatusData } = useDeletionStatus();
  const { data: dashboardData, isLoading: dashboardLoading } = useParentDashboard();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deletionPending = deletionStatusData?.data?.hasPendingDeletion ?? false;
  const children = dashboardData?.data?.children || [];
  // STORY-063: Derive childFirstName/childId from children[0] (multi-child aware),
  // falling back to parentUser for legacy single-child accounts.
  const childFirstName = children[0]?.firstName || parentUser?.childFirstName || '';
  const childId = children[0]?.childId || parentUser?.childId || '';

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
    // STORY-062: Navigate to the dedicated add-child page within the protected dashboard scope.
    navigate('/parent/dashboard/add-child');
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
        id="parent-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
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

        {/* Main scrollable content.
            The tab content region is wrapped in an aria-live="polite" container so
            screen readers announce the new tab heading when the route changes.
            A subtle opacity fade makes the content change perceptible to sighted
            users and respects prefers-reduced-motion. */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" id="parent-dashboard-main">
          <IdleWarningBanner
            isIdle={isIdle}
            idleTime={idleTime}
            onContinue={continueParentSession}
            serverDriven={sessionExpiring}
            secondsRemaining={sessionExpiringSeconds}
          />
          {deletionPending && <DeletionLockedBanner />}
          <div
            aria-live="polite"
            aria-atomic="true"
            data-testid="tab-content-live-region"
            className="tab-content-fade"
            key={location.pathname}
          >
            <Routes>
              <Route index element={<ActivityTab hasChildren={hasChildren} onAddChild={handleAddChild} />} />
              <Route path="export" element={<ExportTab childFirstName={childFirstName} hasChildren={hasChildren} onAddChild={handleAddChild} />} />
              <Route path="delete" element={<DeleteTab childFirstName={childFirstName} childId={childId} deletionPending={deletionPending} hasChildren={hasChildren} onAddChild={handleAddChild} />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
            </Routes>
          </div>
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