import { EDITOR_FONTS, TEXT_COLORS } from '../lib/constants';

const SIZES = [
  { label: 'Pequena', value: '14px' },
  { label: 'Normal', value: '' },
  { label: 'Grande', value: '24px' },
  { label: 'Enorme', value: '32px' },
];

function Tool({ active, onClick, label, children }) {
  return (
    <button type="button" className="tool" aria-pressed={Boolean(active)} aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function Toolbar({ editor }) {
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const style = editor.getAttributes('textStyle');

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatação">
      <div className="toolbar__group">
        <Tool label="Negrito" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><b>N</b></Tool>
        <Tool label="Itálico" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><i>I</i></Tool>
        <Tool label="Sublinhado" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><u>S</u></Tool>
        <Tool label="Riscado" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}><s>R</s></Tool>
      </div>

      <div className="toolbar__group">
        <label className="visually-hidden" htmlFor="font-family">Letra</label>
        <select
          id="font-family"
          className="tool-select"
          value={style.fontFamily || ''}
          onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
        >
          {EDITOR_FONTS.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value || 'inherit' }}>{f.label}</option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor="font-size">Tamanho</label>
        <select
          id="font-size"
          className="tool-select"
          value={style.fontSize || ''}
          onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
        >
          {SIZES.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="toolbar__group" aria-label="Cor da letra">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="tool tool--color"
            style={{ '--swatch': c }}
            aria-label={`Letra na cor ${c}`}
            aria-pressed={style.color === c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => chain().setColor(c).run()}
          />
        ))}
      </div>

      <div className="toolbar__group">
        <Tool label="Título" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>T</Tool>
        <Tool label="Lista" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>•≡</Tool>
        <Tool label="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}>⇤</Tool>
        <Tool label="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}>↔</Tool>
        <Tool label="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}>⇥</Tool>
      </div>

      <div className="toolbar__group">
        <Tool label="Desfazer" onClick={() => chain().undo().run()}>↶</Tool>
        <Tool label="Refazer" onClick={() => chain().redo().run()}>↷</Tool>
      </div>
    </div>
  );
}
