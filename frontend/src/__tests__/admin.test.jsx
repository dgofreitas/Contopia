import { screen, fireEvent } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';
import { sampleMetrics } from './admin-metrics';

const PARENT = { id: 'p'.repeat(24), email: 'admin@exemplo.com', familyCode: 'ABCD2345', familyName: null };

describe('painel do admin', () => {
  it('mostra o link na página da família só para o admin e abre os gráficos', async () => {
    mockApi({
      'GET /auth/me': [200, { role: 'parent', parent: PARENT, child: null, admin: true }],
      'GET /children': [200, { children: [] }],
      'GET /connections': [200, { friends: [], incoming: [], outgoing: [] }],
      'GET /admin/metrics': [200, sampleMetrics()],
    });
    renderAt('/familia');

    fireEvent.click(await screen.findByRole('link', { name: 'Painel' }));
    expect(await screen.findByRole('img', { name: 'Famílias e crianças por semana' })).toBeInTheDocument();
    expect(screen.getByText('Ativas hoje').previousSibling).toHaveTextContent('7');
    expect(screen.getByText('35.210')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Livros mais lidos' })).toHaveTextContent('O Dragão Tímido');
    expect(screen.getByText(/com senha errada/)).toBeInTheDocument();
  });

  it('quem não é admin não vê o link e volta do /admin', async () => {
    mockApi({
      'GET /auth/me': [200, { role: 'parent', parent: PARENT, child: null }],
      'GET /children': [200, { children: [] }],
      'GET /connections': [200, { friends: [], incoming: [], outgoing: [] }],
    });
    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: 'Crianças' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Painel' })).not.toBeInTheDocument();
  });
});
