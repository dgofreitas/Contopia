// Contopia — ParentDashboardPage
// Shell with nav tabs: Activity Summary, Export Data, Delete Account, Privacy Policy
// NFR-PRV-05: No marketing or promotional content — data-only, neutral design
// AC5: Distinct visual style — neutral blues/whites, adult typography, no child illustrations
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ParentNavbar from '../../components/parent/ParentNavbar';
import ParentProtectedRoute from '../../components/parent/ParentProtectedRoute';
import useParentAuth from '../../hooks/useParentAuth';
import useParentAuthStore from '../../stores/parent-auth-store';
import { HiChartBar, HiDownload, HiTrash, HiShieldCheck, HiExclamation } from 'react-icons/hi';
import { Button, Spinner, Alert, Modal } from 'flowbite-react';

function ActivityTab() {
  const parentUser = useParentAuthStore((s) => s.parentUser);
  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Activity Summary
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Child</p>
          <p className="text-lg font-medium text-slate-800">
            {parentUser?.childFirstName || '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Books Created</p>
          <p className="text-lg font-medium text-slate-800">—</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Reading Time</p>
          <p className="text-lg font-medium text-slate-800">—</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-400">
        Detailed activity data will appear here as your child uses the app.
      </p>
    </section>
  );
}

function ExportTab() {
  return (
    <section aria-labelledby="export-heading">
      <h2 id="export-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Export Data
      </h2>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <HiDownload className="w-8 h-8 text-slate-400 mb-3" aria-hidden="true" />
        <p className="text-slate-700 font-medium mb-2">Download Your Child&apos;s Data</p>
        <p className="text-sm text-slate-500 mb-4">
          Export all books, reading progress, and account data as a portable file.
        </p>
        <Button
          disabled
          className="bg-slate-600 text-slate-300 cursor-not-allowed"
          size="sm"
          aria-label="Export feature coming soon"
        >
          Coming Soon
        </Button>
      </div>
    </section>
  );
}

function DeleteTab() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <section aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Delete Account
      </h2>
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <HiExclamation className="w-8 h-8 text-red-500 mb-3" aria-hidden="true" />
        <p className="text-slate-700 font-medium mb-2">Permanently Delete Account</p>
        <p className="text-sm text-slate-500 mb-4">
          This will permanently delete your child&apos;s account, all books, reading data, and parent
          access. This action cannot be undone.
        </p>
        <Button
          disabled
          className="bg-red-600 text-red-200 cursor-not-allowed"
          size="sm"
          aria-label="Delete feature coming soon"
        >
          Coming Soon
        </Button>
      </div>

      <Modal
        show={showConfirm}
        size="md"
        popup
        onClose={() => setShowConfirm(false)}
        aria-labelledby="delete-confirm-title"
      >
        <Modal.Header id="delete-confirm-title">Confirm Deletion</Modal.Header>
        <Modal.Body>
          <p className="text-base text-slate-700">
            Are you sure you want to permanently delete this account? This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" disabled>Confirm Delete</Button>
          <Button color="light" onClick={() => setShowConfirm(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

function PrivacyTab() {
  return (
    <section aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Privacy Policy
      </h2>
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
        <div className="flex items-start gap-3">
          <HiShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-700 mb-1">COPPA Compliant</p>
            <p>
              Contopia complies with the Children&apos;s Online Privacy Protection Act. We only
              collect information necessary for the app to function and never share it with third
              parties.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HiShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-700 mb-1">No Tracking</p>
            <p>
              We show high-level activity aggregates only — book count and reading time — not
              granular behavioral data. No advertisements or third-party tracking.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HiShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-700 mb-1">Data Ownership</p>
            <p>
              You own your child&apos;s data. You can export or delete it at any time from this
              dashboard. No data is retained after account deletion.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HiShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-700 mb-1">Separate Sessions</p>
            <p>
              Parent and child sessions are completely separate. Logging in here does not grant
              access to your child&apos;s session, and vice versa.
            </p>
          </div>
        </div>
      </div>
    </section>
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
        <Routes>
          <Route index element={<ActivityTab />} />
          <Route path="export" element={<ExportTab />} />
          <Route path="delete" element={<DeleteTab />} />
          <Route path="privacy" element={<PrivacyTab />} />
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