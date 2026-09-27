// Figuras desenhadas pelo próprio site (Noto Emoji). Emoji do sistema não
// aparece em todo aparelho, e a criança precisa ver as figuras para entrar.
function fileFor(char) {
  return Array.from(char, (c) => c.codePointAt(0).toString(16))
    .filter((hex) => hex !== 'fe0f')
    .join('-');
}

export function Emoji({ char, label = '', className = '' }) {
  if (!char) return null;
  return (
    <img
      src={`/emoji/${fileFor(char)}.svg`}
      alt={label}
      className={`emoji ${className}`.trim()}
      draggable="false"
    />
  );
}
