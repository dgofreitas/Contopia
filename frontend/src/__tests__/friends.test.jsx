import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const CHILD_ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const PARENT = { id: 'p'.repeat(24), email: 'mae@exemplo.com', familyCode: 'ABCD2345', familyName: 'silva' };
const PARENT_ME = { role: 'parent', parent: PARENT, child: null };
const DRAFT = { id: 'd'.repeat(24), title: 'Para o Leo', cover: { color: '#7C5CFF', sticker: '' }, published: false, visibility: 'private', sharedWith: [], chapters: 1 };
const LEO = { id: 'e'.repeat(24), nickname: 'Leo', avatar: '🐼' };

describe('amigos escolhidos', () => {
  it('publica só para os amigos marcados', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, CHILD_ME],
      'GET /books': [200, { books: [DRAFT] }],
      'GET /books/friends': [200, { families: [{ familyName: 'souza', children: [LEO, { id: 'f'.repeat(24), nickname: 'Davi', avatar: '🦁' }] }] }],
      [`PATCH /books/${DRAFT.id}`]: [200, { book: { ...DRAFT, published: true } }],
    });
    renderAt('/atelie');

    fireEvent.click(await screen.findByRole('button', { name: 'Publicar Para o Leo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Amigos escolhidos/ }));
    expect(await screen.findByRole('group', { name: '@souza' })).toBeInTheDocument();
    const publish = screen.getByRole('button', { name: 'Publicar' });
    expect(publish).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Leo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar para 1 amigo' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ published: true, visibility: 'people', sharedWith: [LEO.id] }));
  });

  it('sem famílias amigas, explica como conseguir', async () => {
    mockApi({
      'GET /auth/me': [200, CHILD_ME],
      'GET /books': [200, { books: [DRAFT] }],
      'GET /books/friends': [200, { families: [] }],
    });
    renderAt('/atelie');
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar Para o Leo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Amigos escolhidos/ }));
    expect(await screen.findByText(/Peça para um adulto convidar/)).toBeInTheDocument();
  });

  it('mostra os livros que os amigos mandaram, com o nome da família', async () => {
    mockApi({
      'GET /auth/me': [200, CHILD_ME],
      'GET /books/family': [200, { children: [], friends: [{ ...LEO, familyName: 'souza', books: [{ id: '9'.repeat(24), title: 'Robôs', cover: { color: '#3A86FF', sticker: '' }, chapters: 1 }] }] }],
    });
    renderAt('/estante/familia');
    expect(await screen.findByRole('heading', { name: /Dos amigos/ })).toBeInTheDocument();
    expect(screen.getByText('@souza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ler Robôs, de Leo' })).toBeInTheDocument();
  });
});

describe('famílias amigas (responsável)', () => {
  it('convida pelo nome e aceita um convite', async () => {
    let links = { friends: [], incoming: [{ id: '1'.repeat(24), familyName: 'costa' }], outgoing: [] };
    const calls = mockApi({
      'GET /auth/me': [200, PARENT_ME],
      'GET /children': [200, { children: [] }],
      'GET /connections': () => [200, links],
      'POST /connections': (body) => {
        links = { ...links, outgoing: [{ id: '2'.repeat(24), familyName: body.name.replace('@', '') }] };
        return [201, { link: { id: '2'.repeat(24), familyName: 'souza', status: 'pending' } }];
      },
      [`POST /connections/${'1'.repeat(24)}/accept`]: () => {
        links = { ...links, incoming: [], friends: [{ id: '1'.repeat(24), familyName: 'costa' }] };
        return [200, { ok: true }];
      },
    });
    renderAt('/familia');

    expect(await screen.findByText('@costa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(await screen.findByText('🤝 @costa')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome da outra família'), { target: { value: '@souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Convidar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Convite enviado para @souza');
    expect(calls.find((c) => c.method === 'POST' && c.path === '/connections').body).toEqual({ name: '@souza' });
  });

  it('pede o nome da família antes de convidar', async () => {
    mockApi({
      'GET /auth/me': [200, { ...PARENT_ME, parent: { ...PARENT, familyName: null } }],
      'GET /children': [200, { children: [] }],
      'GET /connections': [200, { friends: [], incoming: [], outgoing: [] }],
    });
    renderAt('/familia');
    expect(await screen.findByText(/Escolha primeiro o nome da sua família/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convidar' })).not.toBeInTheDocument();
  });
});
