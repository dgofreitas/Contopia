// Contopia — Root Application Component
import { Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './app/auth/RegisterPage';
import VerifyPage from './app/auth/VerifyPage';
import WelcomePage from './app/auth/WelcomePage';
import LoginPage from './app/auth/LoginPage';
import SettingsPage from './app/settings/SettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import SessionTimeoutModal from './components/auth/SessionTimeoutModal';
import useAuthStore from './stores/auth-store';

function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? '/welcome' : '/login'} replace />;
}

export default function App() {
  return (
    <>
      <SessionTimeoutModal />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <WelcomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}