import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const BOOK = {
  id: 'b'.repeat(24), title: 'O Dragão Tímido', cover: { color: '#E8559A', sticker: '🐉' },
  favorite: false, chapters: 1, progress: { chapter: 0, page: 2, updatedAt: '2026-09-25T20:00:00Z' },
};

describe('estante', () => {
  it('mostra os livros, o "continuar lendo" e favorita', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [BOOK] }],
      [`PATCH /books/${BOOK.id}`]: [200, { book: { ...BOOK, favorite: true } }],
    });
    renderAt('/estante');

    const spine = await screen.findByRole('button', { name: 'O Dragão Tímido, lendo' });
    expect(screen.getByRole('button', { name: /Continuar lendo O Dragão Tímido/ })).toBeInTheDocument();

    fireEvent.click(spine);
    expect(await screen.findByRole('dialog', { name: 'O Dragão Tímido' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '☆ Favoritar' }));

    expect(await screen.findByRole('button', { name: '★ Favorito' })).toBeInTheDocument();
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ favorite: true }));
  });

  it('troca o tema e guarda a preferência', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [] }],
      'PATCH /auth/me/theme': [200, { child: { ...ME.child, theme: 'assombracao' } }],
    });
    renderAt('/estante');
    fireEvent.click(await screen.findByRole('button', { name: /Assombração/ }));
    expect(screen.getByRole('button', { name: /Assombração/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(calls.some((c) => c.path === '/auth/me/theme')).toBe(true));
  });

  it('guarda o livro de volta na estante', async () => {
    mockApi({ 'GET /auth/me': [200, ME], 'GET /books': [200, { books: [BOOK] }] });
    renderAt('/estante');

    fireEvent.click(await screen.findByRole('button', { name: 'O Dragão Tímido, lendo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar na estante' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'O Dragão Tímido, lendo' })).toBeVisible();
  });

  it('com muitos livros usa várias prateleiras e filtros', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...BOOK, id: String(i).padStart(24, 'a'), title: `Livro ${i + 1}`, favorite: i < 2, progress: null,
    }));
    mockApi({ 'GET /auth/me': [200, ME], 'GET /books': [200, { books: many }] });
    renderAt('/estante');

    expect(await screen.findByRole('list', { name: 'Prateleira 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Livro \d+/ })).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: '★ Favoritos' }));
    expect(screen.getAllByRole('button', { name: /^Livro \d+/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Lendo/ }));
    expect(screen.getByText('Nenhum livro aqui ainda.')).toBeInTheDocument();
  });

  it('manda para a página inicial quem não entrou', async () => {
    mockApi({ 'GET /auth/me': [401, {}] });
    renderAt('/estante');
    expect(await screen.findByRole('link', { name: /Sou criança/ })).toBeInTheDocument();
  });
});
