import { useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { IMAGE_ALIGNS, IMAGE_WRAPS, DEFAULT_WIDTH, besideColumn, clampWidth, readWidth } from './imageLayout';

// Imagem no editor, com as bolinhas nos cantos para mudar o tamanho.
function ImageView({ node, updateAttributes, selected, editor }) {
  const { src, alt, width, align, wrap } = node.attrs;
  const box = useRef(null);
  const [liveWidth, setLiveWidth] = useState(null);

  const startResize = (event, side) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    handle.setPointerCapture?.(event.pointerId);
    const pageWidth = box.current.parentElement.getBoundingClientRect().width || 1;
    const startX = event.clientX;
    const startWidth = box.current.getBoundingClientRect().width;
    // Imagem no meio cresce para os dois lados ao mesmo tempo.
    const factor = (side === 'left' ? -1 : 1) * (align === 'center' ? 2 : 1);
    let current = width;

    const onMove = (e) => {
      current = clampWidth(((startWidth + (e.clientX - startX) * factor) / pageWidth) * 100);
      setLiveWidth(current);
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      setLiveWidth(null);
      updateAttributes({ width: current });
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const shown = liveWidth ?? width;
  return (
    <NodeViewWrapper
      ref={box}
      className={selected ? 'image-node image-node--selected' : 'image-node'}
      data-align={align}
      data-wrap={wrap}
      style={{ width: `${shown}%` }}
      data-drag-handle
    >
      <img src={src} alt={alt || ''} draggable={false} />
      {selected && editor.isEditable && (
        <>
          <span className="image-node__handle image-node__handle--left" role="presentation" onPointerDown={(e) => startResize(e, 'left')} />
          <span className="image-node__handle image-node__handle--right" role="presentation" onPointerDown={(e) => startResize(e, 'right')} />
          {liveWidth !== null && <span className="image-node__size">{liveWidth}%</span>}
        </>
      )}
    </NodeViewWrapper>
  );
}

// Imagem no meio do texto: largura em % da página, posição (esquerda, meio,
// direita) e, quando está de lado, se o texto passa em volta ou fica em coluna.
export const BookImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: DEFAULT_WIDTH,
        parseHTML: readWidth,
        renderHTML: (attributes) => ({ style: `width: ${attributes.width}%` }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => (IMAGE_ALIGNS.includes(element.getAttribute('data-align')) ? element.getAttribute('data-align') : 'center'),
        renderHTML: (attributes) => ({ 'data-align': attributes.align }),
      },
      wrap: {
        default: 'around',
        parseHTML: (element) => (IMAGE_WRAPS.includes(element.getAttribute('data-wrap')) ? element.getAttribute('data-wrap') : 'around'),
        renderHTML: (attributes) => ({ 'data-wrap': attributes.wrap }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
  addProseMirrorPlugins() {
    // Marca o texto que fica ao lado de uma imagem em colunas (ver imageLayout.js).
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const blocks = [];
            state.doc.forEach((node, offset) => blocks.push({ node, offset }));
            const imageOf = ({ node }) => (node.type.name === 'image' ? node.attrs : null);
            return DecorationSet.create(
              state.doc,
              besideColumn(blocks, imageOf).map(({ node, offset }) => Decoration.node(offset, offset + node.nodeSize, { class: 'beside-column' })),
            );
          },
        },
      }),
    ];
  },
}).configure({ inline: false, allowBase64: false });
