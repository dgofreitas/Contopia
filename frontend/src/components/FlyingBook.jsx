import { useLayoutEffect, useRef } from 'react';
import { animate, usePresence, useReducedMotion } from 'motion/react';
import { BookCover } from './BookCover';
import { Emoji } from './Emoji';

const PERSPECTIVE = 1400;

// Onde está a lombada deste livro na estante (ela fica invisível enquanto o livro está fora).
function spineRect(id) {
  const el = document.querySelector(`[data-spine="${id}"]`);
  if (!el?.offsetHeight) return null;
  // Centro na tela (já com a lombada levantada pelo hover) e o tamanho sem a inclinação.
  const rect = el.getBoundingClientRect();
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  return { width, height, left: rect.left + rect.width / 2 - width / 2, top: rect.top + rect.height / 2 - height / 2 };
}

const onShelfTransform = ({ x, y, scale }) => `perspective(${PERSPECTIVE}px) translateX(${x}px) translateY(${y}px) scale(${scale}) rotateY(90deg)`;

/**
 * Transformações que colocam o livro 3D exatamente em cima da lombada: girado
 * 90° para mostrar só a lombada e encolhido até a altura dela. A perspectiva
 * aumenta a lombada girada, então mede de verdade e corrige duas vezes.
 */
function fitOnShelf(book, spineFace, slot, spine) {
  const at = { x: 0, y: 0, scale: spine.height / slot.height };
  for (let i = 0; i < 3; i += 1) {
    book.style.transform = onShelfTransform(at);
    const face = spineFace.getBoundingClientRect();
    if (!face.height) break;
    at.scale *= spine.height / face.height;
    at.x += spine.left + spine.width / 2 - (face.left + face.width / 2);
    at.y += spine.top + spine.height / 2 - (face.top + face.height / 2);
  }
  book.style.transform = onShelfTransform(at);
  return { ...at, lift: spine.height * 0.6 };
}

/**
 * O livro saindo da estante: sobe pela lombada, sai da prateleira, voa até o
 * centro virando para mostrar a capa. Ao guardar, faz o caminho de volta.
 */
export function FlyingBook({ book, author, gold }) {
  const reduce = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();
  const slotRef = useRef(null);
  const bookRef = useRef(null);
  const spineRef = useRef(null);

  // Antes de pintar: põe o livro em cima da lombada e começa a tirar.
  useLayoutEffect(() => {
    const spine = spineRect(book.id);
    if (reduce || !spine) return undefined;
    const slot = slotRef.current.getBoundingClientRect();
    // A lombada do livro 3D é a mesma da estante, só que ampliada até a altura da capa.
    const k = slot.height / spine.height;
    const style = bookRef.current.style;
    style.setProperty('--w', `${slot.width}px`);
    style.setProperty('--depth', `${spine.width * k}px`);
    style.setProperty('--spine-w', `${spine.width}px`);
    style.setProperty('--spine-h', `${spine.height}px`);
    style.setProperty('--k', k);
    // Já pinta em cima da lombada: o Motion só começa no próximo quadro.
    const from = fitOnShelf(bookRef.current, spineRef.current, slot, spine);
    const controls = animate(
      bookRef.current,
      {
        x: [from.x, from.x, 0],
        y: [from.y, from.y - from.lift, 0],
        scale: [from.scale, from.scale, 1],
        rotateY: [90, 90, 0],
        rotate: [0, -4, 0],
        transformPerspective: PERSPECTIVE,
      },
      { duration: 1.05, times: [0, 0.32, 1], ease: ['easeOut', [0.3, 0.8, 0.3, 1]] },
    );
    return () => controls.stop();
    // Só na entrada: o livro não muda de lugar enquanto está aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar: volta para a lombada e desce para dentro da prateleira.
  useLayoutEffect(() => {
    if (isPresent) return;
    const spine = spineRect(book.id);
    if (reduce || !spine || !bookRef.current) {
      safeToRemove();
      return;
    }
    const slot = slotRef.current.getBoundingClientRect();
    const current = bookRef.current.style.transform;
    const to = fitOnShelf(bookRef.current, spineRef.current, slot, spine);
    bookRef.current.style.transform = current;
    animate(
      bookRef.current,
      {
        x: [0, to.x, to.x],
        y: [0, to.y - to.lift, to.y],
        scale: [1, to.scale, to.scale],
        rotateY: [0, 90, 90],
        rotate: [0, -4, 0],
        transformPerspective: PERSPECTIVE,
      },
      { duration: 0.95, times: [0, 0.68, 1], ease: ['easeInOut', 'easeIn'] },
    ).then(safeToRemove, safeToRemove);
  }, [isPresent, book.id, reduce, safeToRemove]);

  return (
    <div className="overlay__book" ref={slotRef}>
      <div className="book3d" ref={bookRef}>
        <div className="book3d__face book3d__front">
          <BookCover title={book.title} author={author} color={book.cover.color} sticker={book.cover.sticker} gold={gold} size="lg" />
        </div>
        <div ref={spineRef} className="book3d__face book3d__spine spine" style={{ '--c': book.cover.color, '--gold': gold }} aria-hidden="true">
          <span className="spine__title">{book.title}</span>
          {book.cover.sticker && <span className="spine__sticker"><Emoji char={book.cover.sticker} /></span>}
        </div>
        <div className="book3d__face book3d__pages" aria-hidden="true" />
      </div>
    </div>
  );
}
