import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import { AppRoutes } from '../App';

// Simula a API: cada rota "MÉTODO /caminho" devolve [status, corpo].
export function mockApi(routes) {
  const calls = [];
  global.fetch = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    const path = url.replace('/api/v1', '');
    calls.push({ method, path, body: options.body ? JSON.parse(options.body) : undefined });
    const handler = routes[`${method} ${path}`];
    const [status, body] = typeof handler === 'function' ? handler(JSON.parse(options.body || '{}')) : handler || [404, { error: { code: 'NOT_FOUND' } }];
    return { ok: status < 400, status, json: async () => body };
  });
  return calls;
}

export function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}
