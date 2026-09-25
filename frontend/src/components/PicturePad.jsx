import { PICTURES, PICTURE_PASSWORD_LENGTH } from '../lib/constants';

// Teclado de figuras: a criança toca uma sequência de 4 figuras.
export function PicturePad({ value, onChange, disabled }) {
  const add = (index) => {
    if (value.length < PICTURE_PASSWORD_LENGTH) onChange([...value, index]);
  };

  return (
    <div className="pad">
      <div className="pad__slots" aria-live="polite" aria-label={`${value.length} de ${PICTURE_PASSWORD_LENGTH} figuras escolhidas`}>
        {Array.from({ length: PICTURE_PASSWORD_LENGTH }, (_, i) => (
          <span key={i} className={`pad__slot${value[i] !== undefined ? ' pad__slot--on' : ''}`}>
            {value[i] !== undefined ? PICTURES[value[i]] : ''}
          </span>
        ))}
      </div>
      <div className="pad__grid">
        {PICTURES.map((emoji, index) => (
          <button
            key={emoji}
            type="button"
            className="pad__key"
            onClick={() => add(index)}
            disabled={disabled || value.length >= PICTURE_PASSWORD_LENGTH}
            aria-label={`Figura ${index + 1}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => onChange(value.slice(0, -1))} disabled={disabled || value.length === 0}>
        Apagar a última
      </button>
    </div>
  );
}
