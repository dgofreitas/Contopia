const sanitizeHtml = require('sanitize-html');

// O editor gera HTML. Só deixamos passar o que ele sabe produzir.
const FONTS = /^(['"]?[\w\s-]+['"]?,?\s*)+$/;

// Tamanhos antigos e o jeito da imagem na página (ver frontend/src/editor/imageLayout.js).
const IMAGE_SIZES = ['small', 'medium', 'large'];
const IMAGE_ALIGNS = ['left', 'center', 'right'];
const IMAGE_WRAPS = ['around', 'column'];

// Endereço de uma imagem enviada para este livro. Imagem de fora não entra:
// o livro de uma criança não carrega nada de outro site.
const imageSrc = (bookId) => new RegExp(`^/api/v1/books/${bookId}/images/[a-f0-9]{24}$`);

function sanitizeChapterHtml(html, { bookId } = {}) {
  const ownImage = bookId ? imageSrc(bookId) : null;
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'span', 'mark', 'img'],
    allowedAttributes: { '*': ['style'], img: ['src', 'alt', 'data-size', 'data-align', 'data-wrap'] },
    allowedSchemes: [],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === 'img' && (!ownImage || !ownImage.test(frame.attribs.src || '')),
    // Valor desconhecido some, mas a imagem fica.
    transformTags: {
      img: (tagName, attribs) => {
        const clean = { ...attribs };
        if (!IMAGE_SIZES.includes(clean['data-size'])) delete clean['data-size'];
        if (!IMAGE_ALIGNS.includes(clean['data-align'])) delete clean['data-align'];
        if (!IMAGE_WRAPS.includes(clean['data-wrap'])) delete clean['data-wrap'];
        return { tagName, attribs: clean };
      },
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
        'text-align': [/^(left|right|center|justify)$/],
        'font-family': [FONTS],
        'font-size': [/^\d{1,2}(\.\d+)?(px|rem|em)$/],
      },
      img: { width: [/^(1[5-9]|[2-9]\d|100)%$/] },
    },
  });
}

// Ids das imagens que aparecem no texto.
function imageIdsIn(html) {
  return [...html.matchAll(/\/images\/([a-f0-9]{24})"/g)].map((m) => m[1]);
}

module.exports = { sanitizeChapterHtml, imageIdsIn };
