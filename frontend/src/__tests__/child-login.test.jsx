import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const LIA = { id: 'a'.repeat(24), nickname: 'Lia', avatar: '🦉' };

describe('entrada da criança', () => {
  it('acha a família, escolhe o perfil e entra com 4 figuras', async () => {
    const calls = mockApi({
      'GET /auth/me': [401, { error: { code: 'UNAUTHENTICATED' } }],
      'GET /auth/family/ABCD2345': [200, { children: [LIA] }],
      'POST /auth/child/login': [200, { role: 'child', parent: null, child: { ...LIA, theme: 'fadas' } }],
      'GET /books': [200, { books: [] }],
    });
    renderAt('/entrar');

    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'abcd2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Lia/ }));

    for (const n of [1, 4, 6, 4]) fireEvent.click(screen.getByRole('button', { name: `Figura ${n}` }));

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/child/login')).toBe(true));
    expect(calls.find((c) => c.path === '/auth/child/login').body).toEqual({ familyCode: 'ABCD2345', childId: LIA.id, picture: [0, 3, 5, 3] });
    expect(await screen.findByRole('button', { name: 'Criar um livro novo' })).toBeInTheDocument();
  });

  it('avisa quando as figuras estão erradas e limpa a sequência', async () => {
    mockApi({
      'GET /auth/me': [401, {}],
      'GET /auth/family/ABCD2345': [200, { children: [LIA] }],
      'POST /auth/child/login': [401, { error: { code: 'INVALID_PICTURE_PASSWORD' } }],
    });
    renderAt('/entrar');
    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'ABCD2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Lia/ }));
    for (const n of [1, 1, 1, 1]) fireEvent.click(screen.getByRole('button', { name: `Figura ${n}` }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não são as suas figuras');
    expect(screen.getByLabelText('0 de 4 figuras escolhidas')).toBeInTheDocument();
  });

  it('entra com a senha normal quando a criança tem os dois jeitos', async () => {
    const calls = mockApi({
      'GET /auth/me': [401, {}],
      'GET /auth/family/ABCD2345': [200, { children: [{ ...LIA, methods: ['picture', 'text'] }] }],
      'POST /auth/child/login': [200, { role: 'child', parent: null, child: { ...LIA, theme: 'fadas' } }],
      'GET /books': [200, { books: [] }],
    });
    renderAt('/entrar');
    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'ABCD2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Lia/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Senha' }));
    fireEvent.change(screen.getByLabelText('Sua senha'), { target: { value: 'lia2024' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/child/login')).toBe(true));
    expect(calls.find((c) => c.path === '/auth/child/login').body).toEqual({ familyCode: 'ABCD2345', childId: LIA.id, password: 'lia2024' });
  });

  it('vai direto para a senha normal quando a criança não tem figuras', async () => {
    mockApi({
      'GET /auth/me': [401, {}],
      'GET /auth/family/ABCD2345': [200, { children: [{ ...LIA, methods: ['text'] }] }],
    });
    renderAt('/entrar');
    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'ABCD2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Lia/ }));

    expect(screen.getByLabelText('Sua senha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Figura 1' })).not.toBeInTheDocument();
  });
});
