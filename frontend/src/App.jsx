// Contopia — Root Application Component
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import RegisterPage from './app/auth/RegisterPage';
import VerifyPage from './app/auth/VerifyPage';
import WelcomePage from './app/auth/WelcomePage';
import LoginPage from './app/auth/LoginPage';
import ShelfPage from './app/shelf/ShelfPage';
import DraftsListPage from './app/drafts/DraftsListPage';
import EditorPage from './app/editor/EditorPage';
import NewBookPage from './app/editor/NewBookPage';
const CoverDesignerPage = lazy(() => import('./app/cover/CoverDesignerPage'));
const CoverCustomizePage = lazy(() => import('./app/cover/CoverCustomizePage'));
import ReaderPage from './app/reader/ReaderPage';
import SettingsPage from './app/settings/SettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import SessionTimeoutModal from './components/auth/SessionTimeoutModal';
import OfflineBanner from './components/common/OfflineBanner';
import StorageWarningBanner from './components/common/StorageWarningBanner';
import ToastContainer from './components/common/ToastContainer';
import { useErrorStore } from './stores/error-store';
import useAuthStore from './stores/auth-store';
import usePublishedBookSync from './hooks/usePublishedBookSync';

const CoverFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
  </div>
);

function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? '/shelf' : '/login'} replace />;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  // Auto-sync published books to IndexedDB (STORY-051)
  usePublishedBookSync({ enabled: !!token });

  useEffect(() => {
    const handleOnline = () => useErrorStore.getState().setOffline(false);
    const handleOffline = () => useErrorStore.getState().setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    useErrorStore.getState().setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <OfflineBanner />
      <StorageWarningBanner />
      <ToastContainer />
      <SessionTimeoutModal />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/shelf" element={<ShelfPage />} />
          <Route path="/drafts" element={<DraftsListPage />} />
          <Route path="/editor/new" element={<NewBookPage />} />
          <Route path="/editor/:bookId" element={<EditorPage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
          <Route path="/cover/:bookId" element={<Suspense fallback={<CoverFallback />}><CoverDesignerPage /></Suspense>} />
          <Route path="/cover/:bookId/customize" element={<Suspense fallback={<CoverFallback />}><CoverCustomizePage /></Suspense>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
        </Route>
      </Routes>
    </LazyMotion>
  );
}