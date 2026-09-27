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
    const json = typeof options.body === 'string';
    calls.push({ method, path, body: json ? JSON.parse(options.body) : options.body });
    const handler = routes[`${method} ${path}`];
    const [status, body] = typeof handler === 'function' ? handler(json ? JSON.parse(options.body) : options.body || {}) : handler || [404, { error: { code: 'NOT_FOUND' } }];
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
