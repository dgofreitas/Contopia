// Contopia — Root Application Component
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import RegisterPage from './app/auth/RegisterPage';
import VerifyPage from './app/auth/VerifyPage';
import WelcomePage from './app/auth/WelcomePage';
import LoginPage from './app/auth/LoginPage';
import ShelfPage from './app/shelf/ShelfPage';
import EditorPage from './app/editor/EditorPage';
import NewBookPage from './app/editor/NewBookPage';
import ReaderPage from './app/reader/ReaderPage';
import SettingsPage from './app/settings/SettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import SessionTimeoutModal from './components/auth/SessionTimeoutModal';
import OfflineBanner from './components/common/OfflineBanner';
import ToastContainer from './components/common/ToastContainer';
import { useErrorStore } from './stores/error-store';
import useAuthStore from './stores/auth-store';

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
    <>
      <OfflineBanner />
      <ToastContainer />
      <SessionTimeoutModal />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/shelf" element={<ShelfPage />} />
          <Route path="/editor/new" element={<NewBookPage />} />
          <Route path="/editor/:bookId" element={<EditorPage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
        </Route>
      </Routes>
    </>
  );
}