import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const PARENT = { id: 'p'.repeat(24), email: 'mae@exemplo.com', familyCode: 'ABCD2345', familyName: null };
const ME = { role: 'parent', parent: PARENT, child: null };

describe('código e nome da família', () => {
  it('escolhe um código fácil de lembrar ou gera um aleatório', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /children': [200, { children: [] }],
      'PATCH /auth/me/family-code': (body) => [200, { parent: { ...PARENT, familyCode: body.code ? body.code : 'XYZW7890' } }],
    });
    renderAt('/familia');

    fireEvent.click(await screen.findByRole('button', { name: 'Trocar' }));
    const input = screen.getByLabelText('Código novo');
    fireEvent.change(input, { target: { value: 'freitas' } });
    expect(screen.getByRole('button', { name: 'Usar este código' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'freitas123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar este código' }));
    expect(await screen.findByText('FREITAS123')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ code: 'FREITAS123' });

    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    fireEvent.click(screen.getByRole('button', { name: /Gerar um aleatório/ }));
    expect(await screen.findByText('XYZW7890')).toBeInTheDocument();
  });

  it('dá um nome público e mostra quando já está em uso', async () => {
    let taken = true;
    mockApi({
      'GET /auth/me': [200, ME],
      'GET /children': [200, { children: [] }],
      'PATCH /auth/me/family-name': (body) =>
        taken ? [409, { error: { code: 'FAMILY_NAME_TAKEN' } }] : [200, { parent: { ...PARENT, familyName: body.name } }],
    });
    renderAt('/familia');

    fireEvent.click(await screen.findByRole('button', { name: 'Escolher nome' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Freitas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Outra família já usa esse nome');

    taken = false;
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('@freitas')).toBeInTheDocument());
  });
});
