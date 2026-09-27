const sanitizeHtml = require('sanitize-html');

// O editor gera HTML. Só deixamos passar o que ele sabe produzir.
const FONTS = /^(['"]?[\w\s-]+['"]?,?\s*)+$/;

const IMAGE_SIZES = ['small', 'medium', 'large'];

// Endereço de uma imagem enviada para este livro. Imagem de fora não entra:
// o livro de uma criança não carrega nada de outro site.
const imageSrc = (bookId) => new RegExp(`^/api/v1/books/${bookId}/images/[a-f0-9]{24}$`);

function sanitizeChapterHtml(html, { bookId } = {}) {
  const ownImage = bookId ? imageSrc(bookId) : null;
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'span', 'mark', 'img'],
    allowedAttributes: { '*': ['style'], img: ['src', 'alt', 'data-size'] },
    allowedSchemes: [],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) =>
      frame.tag === 'img' && (!ownImage || !ownImage.test(frame.attribs.src || '') || (frame.attribs['data-size'] && !IMAGE_SIZES.includes(frame.attribs['data-size']))),
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
        'text-align': [/^(left|right|center|justify)$/],
        'font-family': [FONTS],
        'font-size': [/^\d{1,2}(\.\d+)?(px|rem|em)$/],
      },
    },
  });
}

// Ids das imagens que aparecem no texto.
function imageIdsIn(html) {
  return [...html.matchAll(/\/images\/([a-f0-9]{24})"/g)].map((m) => m[1]);
}

module.exports = { sanitizeChapterHtml, imageIdsIn };
