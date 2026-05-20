// Contopia — TipTapEditor Unit Tests (STORY-018)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TipTapEditor from '../components/editor/TipTapEditor';

// Mock @tiptap/react entirely
import React from 'react';

let currentEditor = null;
const mockUseEditor = vi.fn();
const mockEditorContent = vi.fn();

function makeEditor() {
  return {
    getHTML: vi.fn(() => '<p>Hello</p>'),
    isDestroyed: false,
    commands: { setContent: vi.fn() },
    destroy: vi.fn(),
  };
}

vi.mock('@tiptap/react', () => ({
  useEditor: (...args) => {
    mockUseEditor(...args);
    return currentEditor;
  },
  EditorContent: (props) => {
    mockEditorContent(props);
    return <div data-testid="editor-content" />;
  },
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({})),
    extend: vi.fn(() => [{}]),
    extensions: [] },
}));

vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

describe('TipTapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentEditor = makeEditor();
  });

  it('renders EditorContent when editor is available', () => {
    render(<TipTapEditor />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('calls onUpdate when editor content changes', () => {
    const onUpdate = vi.fn();
    render(<TipTapEditor onUpdate={onUpdate} />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    useEditorOptions.onUpdate({ editor: currentEditor });
    expect(onUpdate).toHaveBeenCalledWith('<p>Hello</p>');
  });

  it('does not call onUpdate if not provided', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(() => {
      useEditorOptions.onUpdate({ editor: currentEditor });
    }).not.toThrow();
  });

  it('calls editorRef with editor instance on mount', () => {
    const editorRef = vi.fn();
    render(<TipTapEditor editorRef={editorRef} />);
    expect(editorRef).toHaveBeenCalledWith(currentEditor);
  });

  it('passes content to useEditor', () => {
    render(<TipTapEditor content="<p>Test</p>" />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(useEditorOptions.content).toBe('<p>Test</p>');
  });

  it('passes empty string as default content when content is undefined', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(useEditorOptions.content).toBe('');
  });

  it('sets placeholder from prop', () => {
    render(<TipTapEditor placeholder="Write here..." />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('sets aria-label on editor attributes', () => {
    render(<TipTapEditor ariaLabel="Chapter content editor" />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(useEditorOptions.editorProps.attributes['aria-label']).toBe('Chapter content editor');
  });

  it('sets default aria-label when not provided', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(useEditorOptions.editorProps.attributes['aria-label']).toBe('Text editor');
  });

  it('sets role and aria-multiline on editor', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    expect(useEditorOptions.editorProps.attributes.role).toBe('textbox');
    expect(useEditorOptions.editorProps.attributes['aria-multiline']).toBe('true');
  });

  it('sets content via setContent when chapterId changes (useEffect)', () => {
    currentEditor.getHTML.mockReturnValue('<p>Old</p>');

    const { rerender } = render(
      <TipTapEditor content="<p>Old</p>" chapterId="ch1" />
    );

    // Initial mount: getHTML returns '<p>Old</p>' and content is '<p>Old</p>' — same, no call
    expect(currentEditor.commands.setContent).not.toHaveBeenCalled();

    // Rerender with new chapterId and different content
    currentEditor.getHTML.mockReturnValue('<p>Old</p>');
    rerender(
      <TipTapEditor content="<p>New</p>" chapterId="ch2" />
    );

    expect(currentEditor.commands.setContent).toHaveBeenCalledWith('<p>New</p>', false);
  });

  it('does not call setContent when content is the same', () => {
    currentEditor.getHTML.mockReturnValue('<p>Same</p>');

    const { rerender } = render(
      <TipTapEditor content="<p>Same</p>" chapterId="ch1" />
    );

    rerender(
      <TipTapEditor content="<p>Same</p>" chapterId="ch2" />
    );

    expect(currentEditor.commands.setContent).not.toHaveBeenCalled();
  });

  it('handles editor being null (not yet initialized)', () => {
    currentEditor = null;
    const { container } = render(<TipTapEditor />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when editor is not available', () => {
    currentEditor = null;
    const { container } = render(<TipTapEditor content="test" />);
    expect(container.innerHTML).toBe('');
  });

  it('strips style and class attributes from pasted HTML via transformPastedHTML', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    const transform = useEditorOptions.editorProps.transformPastedHTML;

    const result = transform('<p style="color:red" class="big">Hello</p>');
    expect(result).toBe('<p>Hello</p>');
  });

  it('handles multiple style and class attributes in transformPastedHTML', () => {
    render(<TipTapEditor />);
    const useEditorOptions = mockUseEditor.mock.calls[0][0];
    const transform = useEditorOptions.editorProps.transformPastedHTML;

    const result = transform('<div style="margin:0" class="container"><span style="font-size:20px">Text</span></div>');
    expect(result).toBe('<div><span>Text</span></div>');
  });
});
