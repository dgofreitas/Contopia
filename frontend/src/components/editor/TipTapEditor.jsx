import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import '../../styles/editor.css';

function TipTapEditor({
  content,
  onUpdate,
  editorRef,
  placeholder,
  ariaLabel,
  chapterId,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        history: { depth: 50 },
        code: false,
        codeBlock: false,
        strike: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || '',
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        'aria-label': ariaLabel || 'Text editor',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      transformPastedHTML(html) {
        return html
          .replace(/ style="[^"]*"/g, '')
          .replace(/ class="[^"]*"/g, '');
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editorRef) {
      editorRef(editor);
    }
  }, [editor, editorRef]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const incomingContent = content || '';
      const currentHTML = editor.getHTML();
      if (incomingContent !== currentHTML) {
        editor.commands.setContent(incomingContent, false);
      }
    }
  }, [chapterId]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} className="tiptap-editor-content" />;
}

export default TipTapEditor;