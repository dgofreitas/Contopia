import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireChild, RequireParent, useAuth, Loading } from './lib/auth';
import { Welcome } from './pages/Welcome';
import { ParentAuth } from './pages/ParentAuth';
import { Family } from './pages/Family';
import { ChildLogin } from './pages/ChildLogin';
import { ShelfPage } from './pages/ShelfPage';

// O editor traz o TipTap, que é pesado: só carrega quando a criança vai escrever.
const Editor = lazy(() => import('./pages/Editor').then((m) => ({ default: m.Editor })));
const Reader = lazy(() => import('./pages/Reader').then((m) => ({ default: m.Reader })));

function Home() {
  const { me } = useAuth();
  if (me === undefined) return <Loading />;
  if (me?.child) return <Navigate to="/estante" replace />;
  if (me?.role === 'parent') return <Navigate to="/familia" replace />;
  return <Welcome />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<ParentAuth mode="login" />} />
        <Route path="/cadastro" element={<ParentAuth mode="register" />} />
        <Route path="/entrar" element={<ChildLogin />} />
        <Route path="/familia" element={<RequireParent><Family /></RequireParent>} />
        <Route path="/estante" element={<RequireChild><ShelfPage /></RequireChild>} />
        <Route path="/livro/:id/escrever" element={<RequireChild><Editor /></RequireChild>} />
        <Route path="/livro/:id/ler" element={<RequireChild><Reader /></RequireChild>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
