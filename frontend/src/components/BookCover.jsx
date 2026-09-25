// Capa dura no estilo "Livro de histórias": moldura dourada, figurinha e título.
export function BookCover({ title, author, color, sticker, gold = '#FFE7A3', size = 'md' }) {
  return (
    <div className={`cover cover--${size}`} style={{ '--c': color, '--gold': gold }}>
      <div className="cover__frame">
        {sticker && <span className="cover__sticker" aria-hidden="true">{sticker}</span>}
        <h2 className="cover__title">{title || 'Sem título'}</h2>
        {author && <p className="cover__author">por {author}</p>}
      </div>
    </div>
  );
}
