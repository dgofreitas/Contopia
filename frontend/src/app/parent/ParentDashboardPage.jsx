// Contopia — ParentDashboardPage
// Shell with nav tabs: Activity Summary, Export Data, Delete Account, Privacy Policy
// NFR-PRV-05: No marketing or promotional content — data-only, neutral design
// AC5: Distinct visual style — neutral blues/whites, adult typography, no child illustrations
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentNavbar from '../../components/parent/ParentNavbar';
import ParentProtectedRoute from '../../components/parent/ParentProtectedRoute';
import ActivitySummaryCards from '../../components/parent/ActivitySummaryCards';
import ActivityBookGrid from '../../components/parent/ActivityBookGrid';
import PrivacyNoticeBanner from '../../components/parent/PrivacyNoticeBanner';
import ActivityEmptyState from '../../components/parent/ActivityEmptyState';
import ExportDataPanel from '../../components/parent/ExportDataPanel';
import DeleteAccountPanel from '../../components/parent/DeleteAccountPanel';
import DeletionLockedBanner from '../../components/parent/DeletionLockedBanner';
import useParentAuth from '../../hooks/useParentAuth';
import useParentAuthStore from '../../stores/parent-auth-store';
import useActivitySummary from '../../hooks/useActivitySummary';
import useActivityBooks from '../../hooks/useActivityBooks';
import PrivacyPolicyPage from '../../components/parent/PrivacyPolicyPage';
import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../../lib/parent-api-client';
import { Button, Spinner, Alert } from 'flowbite-react';

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



// Idle session warning banner
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

function ParentDashboardLayout() {
  const { isIdle, idleTime, continueParentSession } = useParentAuth();
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const { data: deletionStatusData } = useDeletionStatus();

  const deletionPending = deletionStatusData?.data?.hasPendingDeletion ?? false;
  const childFirstName = parentUser?.childFirstName || '';
  const childId = parentUser?.childId || '';

  // Fetch parent profile on mount if not already loaded
  const parentToken = useParentAuthStore((s) => s.parentToken);
  useEffect(() => {
    if (parentToken && !parentUser?.dashNav) {
      import('../../lib/parent-api-client.js').then(({ default: parentApiClient }) => {
        parentApiClient.get('/me').then(({ data }) => {
          const result = data.data;
          useParentAuthStore.getState().setParentUser({
            parentId: result.parentId,
            email: result.email,
            childId: result.childId,
            childFirstName: result.childFirstName,
            dashNav: result.dashNav,
          });
        }).catch(() => {
          // 401 handled by interceptor
        });
      });
    }
  }, [parentToken, parentUser?.dashNav]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ParentNavbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" id="parent-dashboard-main">
        <IdleWarningBanner
          isIdle={isIdle}
          idleTime={idleTime}
          onContinue={continueParentSession}
        />
        {deletionPending && <DeletionLockedBanner />}
        <Routes>
          <Route index element={<ActivityTab />} />
          <Route path="export" element={<ExportTab childFirstName={childFirstName} />} />
          <Route path="delete" element={<DeleteTab childFirstName={childFirstName} childId={childId} deletionPending={deletionPending} />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Contopia Parent Dashboard · COPPA Compliant
      </footer>
    </div>
  );
}

// Wrap the entire dashboard layout in ParentProtectedRoute
export default function ParentDashboardPage() {
  return (
    <ParentProtectedRoute>
      <ParentDashboardLayout />
    </ParentProtectedRoute>
  );
}