// Contopia — Root Application Component
import { Routes, Route } from 'react-router-dom';
import RegisterPage from './app/auth/RegisterPage';
import VerifyPage from './app/auth/VerifyPage';
import WelcomePage from './app/auth/WelcomePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RegisterPage />} />
      <Route path="/verify/:token" element={<VerifyPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
    </Routes>
  );
}