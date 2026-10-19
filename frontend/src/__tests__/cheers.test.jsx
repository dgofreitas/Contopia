import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const LEO = { id: 'e'.repeat(24), nickname: 'Leo', avatar: '🐼' };

describe('figurinhas e pedidos de capítulo', () => {
  it('no fim do livro do amigo, dá figurinha e pede o próximo capítulo', async () => {
    const BOOK = { id: 'f'.repeat(24), title: 'Robôs no Quintal', cover: { color: '#3A86FF', sticker: '' }, chaptered: true, author: LEO, mine: false, chapters: [{ title: 'Um', html: '<p>Bip bop.</p>' }] };
    const empty = { enabled: true, reactions: [], mine: [], canWantMore: true, wantsMore: false, comments: [] };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${BOOK.id}`]: [200, { book: BOOK }],
      [`GET /books/${BOOK.id}/cheers`]: [200, { cheers: empty }],
      [`PUT /books/${BOOK.id}/reactions`]: (body) => [200, { cheers: { ...empty, reactions: [{ emoji: body.emoji, count: 1 }], mine: [body.emoji] } }],
      [`PUT /books/${BOOK.id}/more`]: [200, { cheers: { ...empty, reactions: [{ emoji: '😂', count: 1 }], mine: ['😂'], wantsMore: true } }],
    });
    renderAt(`/livro/${BOOK.id}/ler`);
    fireEvent.click(await screen.findByRole('button', { name: /Abrir o livro/ }));

    expect(await screen.findByText('Gostou? Dê uma figurinha para Leo!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Engraçado' }));
    expect(await screen.findByRole('button', { name: 'Engraçado, 1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Quero o próximo capítulo/ }));
    expect(await screen.findByRole('button', { name: /Leo já sabe que você quer mais/ })).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PUT').map((c) => c.body)).toEqual([{ emoji: '😂', on: true }, { on: true }]);
  });

  it('desligadas pelo responsável, as figurinhas não aparecem', async () => {
    const BOOK = { id: 'f'.repeat(24), title: 'Robôs no Quintal', cover: { color: '#3A86FF', sticker: '' }, chaptered: false, author: LEO, mine: false, chapters: [{ title: '', html: '<p>Bip bop.</p>' }] };
    mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${BOOK.id}`]: [200, { book: BOOK }],
      [`GET /books/${BOOK.id}/cheers`]: [200, { cheers: { enabled: false, reactions: [], mine: [], canWantMore: false, wantsMore: false, comments: [] } }],
    });
    renderAt(`/livro/${BOOK.id}/ler`);
    fireEvent.click(await screen.findByRole('button', { name: /Abrir o livro/ }));
    expect(await screen.findByText('Bip bop.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Dê uma figurinha/)).not.toBeInTheDocument();
  });

  it('o autor vê as figurinhas novas na estante e quem quer mais', async () => {
    const BOOK = { id: 'b'.repeat(24), title: 'O Dragão Tímido', cover: { color: '#E8559A', sticker: '' }, favorite: false, published: true, chapters: 1, progress: null, cheers: { new: 2, newComments: 1, wantMore: 1 } };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      'GET /books': [200, { books: [BOOK] }],
      [`GET /books/${BOOK.id}/cheers`]: [200, { cheers: { enabled: true, reactions: [{ emoji: '🤩', count: 2, new: 2 }], fans: [{ ...LEO, emojis: ['🤩'] }], wantMore: [LEO], comments: [{ id: 'm'.repeat(24), text: 'Que livro legal!', by: LEO, mine: false, canDelete: true, new: true }] } }],
      [`POST /books/${BOOK.id}/cheers/seen`]: [204, null],
    });
    renderAt('/estante');

    expect(await screen.findByText(/Você ganhou 2 figurinhas novas e 1 recado novo!/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'O Dragão Tímido, 2 figurinhas novas, 1 recado novo, querem o próximo capítulo' }));
    expect(await screen.findByLabelText('Incrível: 2, 2 novas')).toBeInTheDocument();
    expect(screen.getByText('Leo quer o próximo capítulo!')).toBeInTheDocument();
    expect(screen.getByText('Que livro legal!')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === `/books/${BOOK.id}/cheers/seen`)).toBe(true));
  });

  it('o responsável vê as figurinhas da criança e desliga', async () => {
    const PARENT = { id: 'p'.repeat(24), email: 'mae@exemplo.com', familyCode: 'ABCD2345', familyName: 'silva' };
    const KID = { id: 'k'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas', methods: ['picture'], cheersOff: false, books: 1 };
    const calls = mockApi({
      'GET /auth/me': [200, { role: 'parent', parent: PARENT, child: null }],
      'GET /children': [200, { children: [KID] }],
      'GET /connections': [200, { friends: [], incoming: [], outgoing: [] }],
      [`GET /children/${KID.id}/cheers`]: [200, {
        cheersOff: false,
        items: [
          { kind: 'more', book: 'O dragão', reader: { nickname: 'Bia', avatar: '🦊', familyName: 'souza' }, at: '2026-10-17T10:00:00Z' },
          { kind: 'reaction', emoji: '😂', book: 'O dragão', reader: { nickname: 'Leo', avatar: '🐼', familyName: null }, at: '2026-10-17T09:00:00Z' },
          { kind: 'comment', id: 'm'.repeat(24), text: 'Muito bom!', book: 'O dragão', reader: { nickname: 'Leo', avatar: '🐼', familyName: null }, at: '2026-10-17T08:00:00Z' },
        ],
        sent: [{ id: 'n'.repeat(24), text: 'Adorei a fada', book: 'A fada', author: { nickname: 'Bia', avatar: '🦊', familyName: 'souza' }, at: '2026-10-17T07:00:00Z' }],
      }],
      [`DELETE /children/${KID.id}/comments/${'m'.repeat(24)}`]: [204, null],
      [`PATCH /children/${KID.id}`]: (body) => [200, { child: { ...KID, ...body } }],
    });
    renderAt('/familia');

    fireEvent.click(await screen.findByRole('button', { name: 'Figurinhas' }));
    expect(await screen.findByText('Bia (família souza) pediu o próximo capítulo de “O dragão”')).toBeInTheDocument();
    expect(screen.getByText('Leo em “O dragão”')).toBeInTheDocument();
    const toggle = screen.getByRole('checkbox', { name: /Figurinhas, recados e pedidos de capítulo ligados/ });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ cheersOff: true });

    // Recados recebidos e escritos aparecem, e o responsável apaga.
    expect(screen.getByText('Muito bom!')).toBeInTheDocument();
    expect(screen.getByText('Adorei a fada')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Apagar' }).find((b) => b.parentElement.textContent.includes('Muito bom!')));
    await waitFor(() => expect(screen.queryByText('Muito bom!')).not.toBeInTheDocument());
  });

  it('escreve um recado no livro do amigo e apaga o próprio', async () => {
    const BOOK = { id: 'f'.repeat(24), title: 'Robôs no Quintal', cover: { color: '#3A86FF', sticker: '' }, chaptered: false, author: LEO, mine: false, chapters: [{ title: '', html: '<p>Bip bop.</p>' }] };
    const base = { enabled: true, reactions: [], mine: [], canWantMore: false, wantsMore: false, comments: [] };
    const ME_CHILD = { id: ME.child.id, nickname: 'Lia', avatar: '🦉' };
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${BOOK.id}`]: [200, { book: BOOK }],
      [`GET /books/${BOOK.id}/cheers`]: [200, { cheers: base }],
      [`POST /books/${BOOK.id}/comments`]: (body) => [201, { cheers: { ...base, comments: [{ id: 'q'.repeat(24), text: body.text.trim(), by: ME_CHILD, mine: true, canDelete: true }] } }],
      [`DELETE /books/${BOOK.id}/comments/${'q'.repeat(24)}`]: [204, null],
    });
    renderAt(`/livro/${BOOK.id}/ler`);
    fireEvent.click(await screen.findByRole('button', { name: /Abrir o livro/ }));

    const box = await screen.findByLabelText('Recado para Leo');
    expect(screen.getByRole('button', { name: /Enviar recado/ })).toBeDisabled();
    fireEvent.change(box, { target: { value: '<b>Robôs</b> são demais!' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar recado/ }));
    // Aparece como texto, sem virar HTML.
    expect(await screen.findByText('<b>Robôs</b> são demais!')).toBeInTheDocument();
    expect(box).toHaveValue('');
    expect(calls.find((c) => c.method === 'POST').body).toEqual({ text: '<b>Robôs</b> são demais!' });

    fireEvent.click(screen.getByRole('button', { name: 'Apagar recado de Lia' }));
    await waitFor(() => expect(screen.queryByText('<b>Robôs</b> são demais!')).not.toBeInTheDocument());
  });
});
