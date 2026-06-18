import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBold, FaItalic, FaHeading } from 'react-icons/fa';
import { HiMinus, HiArrowLeft, HiArrowRight } from 'react-icons/hi';

const TOOLBAR_ITEMS = [
  { key: 'bold', icon: FaBold, action: 'toggleBold', canAction: 'toggleBold', toggleable: true, activeCheck: 'bold' },
  { key: 'italic', icon: FaItalic, action: 'toggleItalic', canAction: 'toggleItalic', toggleable: true, activeCheck: 'italic' },
  { key: 'heading', icon: FaHeading, action: 'toggleHeading', canAction: 'toggleHeading', toggleable: true, activeCheck: 'heading', options: { level: 2 } },
  { key: 'chapterBreak', icon: HiMinus, action: 'setHorizontalRule', canAction: 'setHorizontalRule', toggleable: false, activeCheck: null },
  { key: 'undo', icon: HiArrowLeft, action: 'undo', canAction: 'undo', toggleable: false, activeCheck: null },
  { key: 'redo', icon: HiArrowRight, action: 'redo', canAction: 'redo', toggleable: false, activeCheck: null },
];

const ANNOUNCEMENT_KEY = {
  bold: 'boldApplied',
  italic: 'italicApplied',
  heading: 'headingApplied',
  chapterBreak: 'chapterBreakApplied',
  undo: 'undoApplied',
  redo: 'redoApplied',
};

function EditorToolbar({ editor, ariaLabel, onAnnounce }) {
  const { t } = useTranslation('editor');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const collapseTimerRef = useRef(null);

  const canExecute = useCallback((item) => {
    if (!editor) return false;
    if (item.key === 'undo') return editor.can().undo();
    if (item.key === 'redo') return editor.can().redo();
    if (item.key === 'chapterBreak') return editor.can().setHorizontalRule();
    if (item.key === 'heading') return editor.can().chain().focus().toggleHeading({ level: 2 }).run();
    if (item.key === 'bold') return editor.can().chain().focus().toggleBold().run();
    if (item.key === 'italic') return editor.can().chain().focus().toggleItalic().run();
    return false;
  }, [editor]);

  const isActive = useCallback((item) => {
    if (!editor || !item.toggleable) return false;
    if (item.activeCheck === 'bold') return editor.isActive('bold');
    if (item.activeCheck === 'italic') return editor.isActive('italic');
    if (item.activeCheck === 'heading') return editor.isActive('heading', { level: 2 });
    return false;
  }, [editor]);

  const handleAction = useCallback((item) => {
    if (!editor) return;
    if (item.key === 'bold') editor.chain().focus().toggleBold().run();
    else if (item.key === 'italic') editor.chain().focus().toggleItalic().run();
    else if (item.key === 'heading') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (item.key === 'chapterBreak') editor.chain().focus().setHorizontalRule().run();
    else if (item.key === 'undo') editor.chain().focus().undo().run();
    else if (item.key === 'redo') editor.chain().focus().redo().run();

    if (onAnnounce) {
      const key = ANNOUNCEMENT_KEY[item.key];
      if (key) onAnnounce(key);
    }

    if (window.innerWidth < 768) {
      setIsMobileExpanded(false);
    }
  }, [editor, onAnnounce]);

  const handleMobileToggle = useCallback(() => {
    setIsMobileExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight'
        ? (index + 1) % TOOLBAR_ITEMS.length
        : (index - 1 + TOOLBAR_ITEMS.length) % TOOLBAR_ITEMS.length;
      setFocusedIndex(next);
      e.currentTarget.parentElement?.children[next]?.focus();
    }
  }, []);

  const labelKey = {
    bold: 'boldButton',
    italic: 'italicButton',
    heading: 'headingButton',
    chapterBreak: 'chapterBreakButton',
    undo: 'undoButton',
    redo: 'redoButton',
  };

  return (
    <div className="editor-toolbar-wrapper">
      <div
        role="toolbar"
        aria-label={ariaLabel || t('formattingToolbar')}
        className="flex items-center gap-1"
      >
        <button
          className="md:hidden flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          onClick={handleMobileToggle}
          aria-expanded={isMobileExpanded}
          aria-label={t('formatToggle')}
          type="button"
        >
          {t('formatToggle')} ▾
        </button>
        <div
          className={`${
            isMobileExpanded ? 'flex' : 'hidden md:flex'
          } items-center gap-1 overflow-x-auto`}
        >
          {TOOLBAR_ITEMS.map((item, index) => (
            <button
              key={item.key}
              aria-label={t(labelKey[item.key])}
              aria-pressed={item.toggleable ? isActive(item) : undefined}
              disabled={!canExecute(item)}
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleAction(item)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              type="button"
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-30 disabled:cursor-not-allowed ${
                isActive(item)
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EditorToolbar;