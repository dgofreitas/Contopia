// Como a imagem fica na página. Precisa bater com backend/src/lib/sanitize.js.
export const IMAGE_ALIGNS = ['left', 'center', 'right'];
export const IMAGE_WRAPS = ['around', 'column'];
export const MIN_WIDTH = 15;
export const DEFAULT_WIDTH = 60;

// Imagens antigas tinham só três tamanhos.
const LEGACY_SIZES = { small: 35, medium: 65, large: 100 };

export const clampWidth = (value) => Math.max(MIN_WIDTH, Math.min(100, Math.round(value)));

export function readWidth(element) {
  const fromStyle = parseFloat(element.style.width);
  if (element.style.width.endsWith('%') && fromStyle > 0) return clampWidth(fromStyle);
  return LEGACY_SIZES[element.getAttribute('data-size')] || DEFAULT_WIDTH;
}

// Imagem de lado em "colunas": o texto que vem depois fica só ao lado dela,
// sem passar por baixo, até a próxima imagem.
export const isColumn = ({ align, wrap }) => align !== 'center' && wrap === 'column';

/**
 * Marca os blocos de texto que ficam ao lado de uma imagem em colunas.
 * `blocks` é a lista de blocos na ordem; `imageOf(block)` devolve os dados da
 * imagem ({ align, wrap }) ou null quando o bloco é texto.
 */
export function besideColumn(blocks, imageOf) {
  let column = false;
  return blocks.filter((block) => {
    const image = imageOf(block);
    if (image) {
      column = isColumn(image);
      return false;
    }
    return column;
  });
}

// Mesma marcação na leitura, direto no HTML já montado.
export function markColumnText(container) {
  if (!container) return;
  const children = Array.from(container.children);
  children.forEach((el) => el.classList.remove('beside-column'));
  const imageOf = (el) => (el.tagName === 'IMG' ? { align: el.getAttribute('data-align') || 'center', wrap: el.getAttribute('data-wrap') } : null);
  besideColumn(children, imageOf).forEach((el) => el.classList.add('beside-column'));
}
