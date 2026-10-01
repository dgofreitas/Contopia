import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const BOOK = {
  id: 'b'.repeat(24), title: 'O Dragão Tímido', cover: { color: '#E8559A', sticker: '🐉' },
  favorite: false, published: true, chapters: 1, progress: { chapter: 0, page: 2, updatedAt: '2026-09-25T20:00:00Z' },
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

  it('deixa os livros sendo escritos no ateliê e publica', async () => {
    const DRAFT = { ...BOOK, id: 'd'.repeat(24), title: 'A Fada Sonâmbula', published: false, progress: null };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [BOOK, DRAFT] }],
      [`PATCH /books/${DRAFT.id}`]: [200, { book: { ...DRAFT, published: true } }],
    });
    renderAt('/estante');

    await screen.findByRole('button', { name: 'O Dragão Tímido, lendo' });
    expect(screen.queryByRole('button', { name: /A Fada Sonâmbula/ })).not.toBeInTheDocument();

    // O mapa avisa que há um livro esperando e leva ao ateliê.
    fireEvent.click(await screen.findByRole('button', { name: 'Mapa, 1 livro sendo escrito' }));
    fireEvent.click(screen.getByRole('link', { name: 'Ateliê, 1 livro sendo escrito' }));
    expect(await screen.findByRole('button', { name: 'Escrever A Fada Sonâmbula' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /O Dragão Tímido/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publicar A Fada Sonâmbula' }));
    fireEvent.click(await screen.findByRole('button', { name: /Minha família/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('A Fada Sonâmbula foi publicado');
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ published: true, visibility: 'family' });
  });

  it('devolve um livro publicado para o ateliê', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [BOOK] }],
      [`PATCH /books/${BOOK.id}`]: [200, { book: { ...BOOK, published: false } }],
    });
    renderAt('/estante');

    fireEvent.click(await screen.findByRole('button', { name: 'O Dragão Tímido, lendo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Voltar para o ateliê/ }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /O Dragão Tímido/ })).not.toBeInTheDocument());
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ published: false });
    expect(screen.getByRole('button', { name: 'Mapa, 1 livro sendo escrito' })).toBeInTheDocument();
  });

  it('apaga um rascunho do ateliê depois de confirmar', async () => {
    const DRAFT = { ...BOOK, published: false, progress: null };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [DRAFT] }],
      [`DELETE /books/${DRAFT.id}`]: [204, null],
    });
    const confirm = vi.spyOn(window, 'confirm');
    renderAt('/atelie');
    const trash = await screen.findByRole('button', { name: 'Apagar O Dragão Tímido' });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(trash);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);

    confirm.mockReturnValueOnce(true);
    fireEvent.click(trash);
    await waitFor(() => expect(screen.queryByRole('button', { name: /O Dragão Tímido/ })).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
    confirm.mockRestore();
  });

  it('deixa a família ler um livro da estante', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [{ ...BOOK, visibility: 'private' }] }],
      [`PATCH /books/${BOOK.id}`]: [200, { book: { ...BOOK, visibility: 'family' } }],
    });
    renderAt('/estante');
    fireEvent.click(await screen.findByRole('button', { name: 'O Dragão Tímido, lendo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Só eu leio/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Minha família/ }));
    expect(await screen.findByRole('button', { name: /A família pode ler/ })).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ visibility: 'family' });
  });

  it('mostra a estante da família e abre o livro do irmão só para ler', async () => {
    const LEO = { id: 'e'.repeat(24), nickname: 'Leo', avatar: '🐼' };
    const SHARED = { id: 'f'.repeat(24), title: 'Robôs no Quintal', cover: { color: '#3A86FF', sticker: '🤖' }, chaptered: false, chapters: 1, author: LEO };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [BOOK] }],
      'GET /books/family': [200, { children: [{ ...LEO, books: [SHARED] }] }],
      [`GET /books/${SHARED.id}`]: [200, { book: { ...SHARED, mine: false, chapters: [{ title: '', html: '<p>Bip bop.</p>' }] } }],
    });
    renderAt('/estante');
    fireEvent.click(await screen.findByRole('button', { name: 'Mapa' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Família e amigos, 1 livro para ler' }));

    // O livro do Leo fica na prateleira dele; tirado da prateleira, só dá para ler.
    fireEvent.click(await screen.findByRole('button', { name: 'Robôs no Quintal' }));
    expect(await screen.findByRole('dialog', { name: 'Robôs no Quintal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Escrever|Favoritar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ler/ }));

    expect(await screen.findByRole('link', { name: '← Família' })).toBeInTheDocument();
    expect(screen.getByText('por Leo')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Escrever/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Abrir o livro/ }));
    expect(await screen.findByText('Bip bop.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 700));
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('troca o tema e guarda a preferência', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [] }],
      'PATCH /auth/me/theme': [200, { child: { ...ME.child, theme: 'assombracao' } }],
    });
    renderAt('/estante');
    fireEvent.click(await screen.findByRole('button', { name: 'Temas' }));
    // Escolher já troca o cenário, e a paleta fica aberta até o "Pronto".
    fireEvent.click(await screen.findByRole('button', { name: /Assombração/ }));
    expect(screen.getByRole('button', { name: /Assombração/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(calls.some((c) => c.path === '/auth/me/theme')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: '✓ Pronto' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Assombração/ })).not.toBeInTheDocument());
  });

  it('o mapa leva aos lugares e o avatar guarda o "Sair"', async () => {
    mockApi({ 'GET /auth/me': [200, ME], 'GET /books': [200, { books: [BOOK] }], 'POST /auth/logout': [204, null] });
    renderAt('/estante');
    fireEvent.click(await screen.findByRole('button', { name: 'Mapa' }));
    const nav = screen.getByRole('navigation', { name: 'Para onde vamos?' });
    expect(nav).toHaveTextContent('Minha estante');
    expect(screen.getByRole('link', { name: 'Minha estante' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Grupos' })).toHaveAttribute('href', '/grupos');

    // Tocar fora fecha o mapa.
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Para onde vamos?' })).not.toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /Sair/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lia/ }));
    expect(screen.getByRole('button', { name: /Sair/ })).toBeInTheDocument();
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
