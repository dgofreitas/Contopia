import { NodeSelection } from '@tiptap/pm/state';

// Os cinco jeitos de pôr a imagem na página, cada um com um desenho do resultado.
export const IMAGE_LAYOUTS = [
  { label: 'Imagem à esquerda, texto em volta', align: 'left', wrap: 'around' },
  { label: 'Imagem à esquerda, texto em coluna', align: 'left', wrap: 'column' },
  { label: 'Imagem no meio, texto em cima e embaixo', align: 'center', wrap: 'around' },
  { label: 'Imagem à direita, texto em coluna', align: 'right', wrap: 'column' },
  { label: 'Imagem à direita, texto em volta', align: 'right', wrap: 'around' },
];

const Line = ({ x1, x2, y }) => <line x1={x1} x2={x2} y1={y} y2={y} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />;

function LayoutIcon({ align, wrap }) {
  const lines = [];
  let pic;
  if (align === 'center') {
    pic = <rect x="7" y="7" width="10" height="9" rx="1.5" />;
    lines.push([3, 21, 4], [3, 21, 19.5]);
  } else {
    const left = align === 'left';
    pic = <rect x={left ? 3 : 12} y="3.5" width="9" height="9" rx="1.5" />;
    const [a, b] = left ? [14.5, 21] : [3, 9.5];
    lines.push([a, b, 4.5], [a, b, 8], [a, b, 11.5]);
    if (wrap === 'column') lines.push([a, b, 15], [a, b, 18.5]);
    else lines.push([3, 21, 15.5], [3, 21, 19]);
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#2EC4B6">{pic}</g>
      {lines.map(([x1, x2, y]) => <Line key={`${x1}-${y}`} x1={x1} x2={x2} y={y} />)}
    </svg>
  );
}

// Troca a imagem selecionada de lugar com o bloco de cima ou de baixo.
// É o jeito de mover no celular, onde arrastar não funciona bem.
function moveImage(editor, direction) {
  const { state, view } = editor;
  const { selection } = state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') return;
  const $pos = state.doc.resolve(selection.from);
  const index = $pos.index();
  const neighbor = direction < 0 ? $pos.parent.maybeChild(index - 1) : $pos.parent.maybeChild(index + 1);
  if (!neighbor) return;
  const tr = state.tr.delete(selection.from, selection.to);
  const target = direction < 0 ? selection.from - neighbor.nodeSize : selection.from + neighbor.nodeSize;
  tr.insert(target, selection.node);
  tr.setSelection(NodeSelection.create(tr.doc, target));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

export function ImageTools({ editor, Tool }) {
  const { align, wrap } = editor.getAttributes('image');
  const chain = () => editor.chain().focus();
  return (
    <div className="toolbar__group toolbar__group--image" aria-label="Imagem">
      {IMAGE_LAYOUTS.map((layout) => (
        <Tool
          key={layout.label}
          label={layout.label}
          active={align === layout.align && (align === 'center' || wrap === layout.wrap)}
          onClick={() => chain().updateAttributes('image', { align: layout.align, wrap: layout.wrap }).run()}
        >
          <LayoutIcon align={layout.align} wrap={layout.wrap} />
        </Tool>
      ))}
      <Tool label="Subir a imagem" onClick={() => moveImage(editor, -1)}>↑</Tool>
      <Tool label="Descer a imagem" onClick={() => moveImage(editor, 1)}>↓</Tool>
    </div>
  );
}
