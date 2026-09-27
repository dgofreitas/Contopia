const sharp = require('sharp');
const { processImage } = require('../lib/images');
const { sanitizeChapterHtml, imageIdsIn } = require('../lib/sanitize');

const BOOK = 'a'.repeat(24);
const IMAGE = 'b'.repeat(24);

describe('processImage', () => {
  it('reduz imagens largas e converte para WebP', async () => {
    const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#2ec4b6' } }).jpeg().toBuffer();
    const out = await processImage(input);
    expect(out).toMatchObject({ width: 1200, height: 600 });
    expect((await sharp(out.data).metadata()).format).toBe('webp');
  });

  it('não aumenta imagens pequenas', async () => {
    const input = await sharp({ create: { width: 40, height: 30, channels: 4, background: '#0000' } }).png().toBuffer();
    expect(await processImage(input)).toMatchObject({ width: 40, height: 30 });
  });

  it('recusa o que não é imagem', async () => {
    await expect(processImage(Buffer.from('<svg></svg>'))).rejects.toMatchObject({ code: expect.stringMatching(/^IMAGE_/) });
    await expect(processImage(Buffer.from('oi'))).rejects.toMatchObject({ code: 'IMAGE_INVALID' });
  });
});

describe('imagens no HTML do capítulo', () => {
  const own = `/api/v1/books/${BOOK}/images/${IMAGE}`;

  it('mantém só imagens enviadas para o próprio livro', () => {
    const html = `<img src="${own}" alt="gato" data-size="small" onerror="alert(1)"><img src="https://x.com/a.png"><img src="data:image/png;base64,AAAA"><img src="${own}" data-size="gigante">`;
    expect(sanitizeChapterHtml(html, { bookId: BOOK })).toBe(`<img src="${own}" alt="gato" data-size="small" />`);
  });

  it('sem livro, nenhuma imagem passa', () => {
    expect(sanitizeChapterHtml(`<p>a</p><img src="${own}">`)).toBe('<p>a</p>');
  });

  it('encontra os ids das imagens no texto', () => {
    expect(imageIdsIn(sanitizeChapterHtml(`<img src="${own}">`, { bookId: BOOK }))).toEqual([IMAGE]);
  });
});
