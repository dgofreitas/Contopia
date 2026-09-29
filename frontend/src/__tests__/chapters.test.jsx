import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const ID = 'b'.repeat(24);
const BOOK = {
  id: ID, title: 'Diário de férias', cover: { color: '#E8559A', sticker: '🐉' }, favorite: false,
  chaptered: false, chapters: [{ title: '', html: '<p>Fui à praia.</p>' }], progress: null,
};

describe('livros sem capítulos', () => {
  it('o livro novo começa como texto corrido e pode ter capítulos', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [] }],
      'POST /books': [201, { book: BOOK }],
      [`GET /books/${ID}`]: [200, { book: BOOK }],
    });
    renderAt('/atelie');
    fireEvent.click(await screen.findByRole('button', { name: /Livro novo/ }));
    expect(screen.getByRole('button', { name: /Texto corrido/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Diário de férias' } });
    fireEvent.click(screen.getByRole('button', { name: 'Começar a escrever' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST').body).toMatchObject({ chaptered: false }));
  });

  it('o editor não mostra capítulos e deixa dividir depois', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${ID}`]: [200, { book: BOOK }],
      [`PATCH /books/${ID}`]: [200, { book: BOOK }],
    });
    renderAt(`/livro/${ID}/escrever`);
    const split = await screen.findByRole('button', { name: /Dividir em capítulos/ });
    expect(screen.queryByRole('navigation', { name: 'Capítulos' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome do capítulo')).not.toBeInTheDocument();

    fireEvent.click(split);
    expect(screen.getByRole('navigation', { name: 'Capítulos' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do capítulo')).toHaveValue('Capítulo 1');
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      chaptered: true,
      chapters: [{ title: 'Capítulo 1', html: '<p>Fui à praia.</p>' }],
    }), { timeout: 3000 });
  });
});
