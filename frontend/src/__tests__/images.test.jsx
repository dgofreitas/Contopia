import { screen, fireEvent, waitFor } from '@testing-library/react';
import { mockApi, renderAt } from './helpers';

const ME = { role: 'child', parent: null, child: { id: 'c'.repeat(24), nickname: 'Lia', avatar: '🦉', theme: 'fadas' } };
const ID = 'b'.repeat(24);
const IMAGE = 'd'.repeat(24);
const URL = `/api/v1/books/${ID}/images/${IMAGE}`;
const BOOK = {
  id: ID, title: 'Com figuras', cover: { color: '#E8559A', sticker: '' }, favorite: false,
  chaptered: false, chapters: [{ title: '', html: '<p>Olha o meu gato:</p>' }], progress: null,
};

describe('imagens no texto', () => {
  it('envia a imagem escolhida e coloca no texto', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${ID}`]: [200, { book: BOOK }],
      [`POST /books/${ID}/images`]: [201, { image: { id: IMAGE, url: URL, width: 800, height: 600 } }],
      [`PATCH /books/${ID}`]: [200, { book: BOOK }],
    });
    renderAt(`/livro/${ID}/escrever`);
    await screen.findByRole('button', { name: 'Colocar imagem' });

    const file = new File(['png'], 'gato.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('image-input'), { target: { files: [file] } });

    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toBe(file));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body.chapters[0].html).toContain(`<img src="${URL}" alt="gato" data-size="medium">`), { timeout: 3000 });
  });

  it('avisa quando o arquivo não é uma imagem aceita', async () => {
    const calls = mockApi({
      'GET /auth/me': [200, ME],
      [`GET /books/${ID}`]: [200, { book: BOOK }],
    });
    renderAt(`/livro/${ID}/escrever`);
    await screen.findByRole('button', { name: 'Colocar imagem' });

    fireEvent.change(screen.getByTestId('image-input'), { target: { files: [new File(['x'], 'desenho.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPG, WebP ou GIF');

    const huge = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(screen.getByTestId('image-input'), { target: { files: [huge] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('5 MB');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});
