const sanitizeHtml = require('sanitize-html');

// O editor gera HTML. Só deixamos passar o que ele sabe produzir.
const FONTS = /^(['"]?[\w\s-]+['"]?,?\s*)+$/;

function sanitizeChapterHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'span', 'mark'],
    allowedAttributes: { '*': ['style'] },
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

module.exports = { sanitizeChapterHtml };
