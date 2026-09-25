import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { api, messageFor } from '../lib/api';
import { useAuth } from '../lib/auth';
import { COVER_COLORS, STICKERS } from '../lib/constants';
import { themeFor } from '../scene/themes';
import { FontSize } from '../editor/FontSize';
import { Toolbar } from '../editor/Toolbar';
import { BookCover } from '../components/BookCover';

const AUTOSAVE_MS = 1200;

// Estado do salvamento mostrado para a criança.
const SAVE_LABEL = { saved: 'Tudo salvo ✓', dirty: 'Escrevendo...', saving: 'Salvando...', error: 'Não consegui salvar. Vou tentar de novo.' };

export function Editor() {
  const { id } = useParams();
  const { me } = useAuth();
  const theme = themeFor(me.child.theme);
  const [book, setBook] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [status, setStatus] = useState('saved');
  const [showCover, setShowCover] = useState(false);
  const [error, setError] = useState('');

  // O livro em edição mora num ref para o autosave sempre mandar a versão mais nova.
  const draft = useRef(null);
  const timer = useRef(null);
  const indexRef = useRef(0);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (!draft.current) return;
    setStatus('saving');
    const { title, cover, chapters } = draft.current;
    try {
      await api.patch(`/books/${id}`, { title: title.trim() || 'Sem título', cover, chapters });
      setStatus((s) => (s === 'saving' ? 'saved' : s));
    } catch {
      setStatus('error');
      timer.current = setTimeout(save, AUTOSAVE_MS * 4);
    }
  }, [id]);

  const schedule = useCallback(() => {
    setStatus('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_MS);
  }, [save]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false, horizontalRule: false }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Era uma vez...' }),
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      if (!draft.current) return;
      draft.current.chapters[indexRef.current].html = ed.getHTML();
      schedule();
    },
  });

  useEffect(() => {
    api
      .get(`/books/${id}`)
      .then(({ book: loaded }) => {
        draft.current = { title: loaded.title, cover: loaded.cover, chapters: loaded.chapters };
        setBook(loaded);
      })
      .catch((err) => setError(messageFor(err)));
  }, [id]);

  // Troca o conteúdo do editor quando muda o capítulo.
  useEffect(() => {
    if (!editor || !book) return;
    indexRef.current = chapterIndex;
    editor.commands.setContent(draft.current.chapters[chapterIndex]?.html || '', false);
  }, [editor, book, chapterIndex]);

  // Salva ao sair da página.
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
      save();
    }
  }, [save]);

  const update = (changes) => {
    draft.current = { ...draft.current, ...changes };
    setBook((b) => ({ ...b, ...changes }));
    schedule();
  };

  const renameChapter = (index, title) => {
    const chapters = draft.current.chapters.map((c, i) => (i === index ? { ...c, title } : c));
    update({ chapters });
  };

  const addChapter = () => {
    const chapters = [...draft.current.chapters, { title: `Capítulo ${draft.current.chapters.length + 1}`, html: '' }];
    update({ chapters });
    setChapterIndex(chapters.length - 1);
  };

  const removeChapter = (index) => {
    if (draft.current.chapters.length === 1) return;
    const chapters = draft.current.chapters.filter((_, i) => i !== index);
    update({ chapters });
    setChapterIndex((current) => Math.max(0, Math.min(current >= index ? current - 1 : current, chapters.length - 1)));
  };

  if (error) {
    return (
      <main className="desk">
        <p className="error" role="alert">{error}</p>
        <Link to="/estante" className="btn">Voltar para a estante</Link>
      </main>
    );
  }
  if (!book) return <main className="desk"><p className="muted">Abrindo o livro...</p></main>;

  const words = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <main className="writing" style={{ '--c': book.cover.color, '--gold': theme.gold }}>
      <header className="writing__header">
        <Link to="/estante" className="btn btn--small" onClick={() => save()}>← Estante</Link>
        <label className="visually-hidden" htmlFor="book-title">Título do livro</label>
        <input id="book-title" className="writing__title" maxLength={80} value={book.title} onChange={(e) => update({ title: e.target.value })} />
        <span className={`save save--${status}`} role="status">{SAVE_LABEL[status]}</span>
        <button type="button" className="btn btn--small" onClick={() => setShowCover((v) => !v)} aria-expanded={showCover}>🎨 Capa</button>
        <Link to={`/livro/${id}/ler`} className="btn btn--small btn--primary" onClick={() => save()}>📖 Ler</Link>
      </header>

      {showCover && (
        <section className="cover-panel" aria-label="Capa">
          <BookCover title={book.title} author={me.child.nickname} color={book.cover.color} sticker={book.cover.sticker} gold={theme.gold} size="sm" />
          <div className="stack">
            <div className="swatches">
              {COVER_COLORS.map((c) => (
                <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={c === book.cover.color} aria-label={`Cor ${c}`} onClick={() => update({ cover: { ...book.cover, color: c } })} />
              ))}
            </div>
            <div className="stickers">
              {STICKERS.map((s) => (
                <button key={s || 'nenhuma'} type="button" className="sticker" aria-pressed={s === book.cover.sticker} aria-label={s ? `Figurinha ${s}` : 'Sem figurinha'} onClick={() => update({ cover: { ...book.cover, sticker: s } })}>
                  {s || '∅'}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="writing__body">
        <nav className="chapters" aria-label="Capítulos">
          <ol>
            {book.chapters.map((chapter, index) => (
              <li key={index} className={index === chapterIndex ? 'chapters__item chapters__item--on' : 'chapters__item'}>
                <button type="button" className="chapters__open" onClick={() => setChapterIndex(index)} aria-current={index === chapterIndex}>
                  {chapter.title || `Capítulo ${index + 1}`}
                </button>
                {book.chapters.length > 1 && (
                  <button type="button" className="chapters__remove" aria-label={`Apagar ${chapter.title || `capítulo ${index + 1}`}`} onClick={() => removeChapter(index)}>×</button>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn--small" onClick={addChapter} disabled={book.chapters.length >= 60}>+ Capítulo</button>
        </nav>

        <section className="page-sheet">
          <label className="visually-hidden" htmlFor="chapter-title">Nome do capítulo</label>
          <input
            id="chapter-title"
            className="page-sheet__chapter"
            placeholder={`Capítulo ${chapterIndex + 1}`}
            maxLength={120}
            value={book.chapters[chapterIndex]?.title || ''}
            onChange={(e) => renameChapter(chapterIndex, e.target.value)}
          />
          <Toolbar editor={editor} />
          <EditorContent editor={editor} className="page-sheet__text" />
          <p className="page-sheet__count">{words === 1 ? '1 palavra' : `${words} palavras`} neste capítulo</p>
        </section>
      </div>
    </main>
  );
}
