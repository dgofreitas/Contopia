// Contopia — ChapterEditor Component Tests (STORY-017)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChapterEditor from '../app/editor/ChapterEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ChapterEditor', () => {
  it('renders chapter title when chapter is provided', () => {
    const chapter = { _id: 'c1', title: 'My Chapter', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    expect(screen.getByText('My Chapter')).toBeInTheDocument();
  });

  it('renders empty state message when no chapter', () => {
    render(<ChapterEditor chapter={null} />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('renders auto save hint', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    expect(screen.getByText('autoSaveHint')).toBeInTheDocument();
  });

  it('renders undefined chapter as empty state', () => {
    render(<ChapterEditor chapter={undefined} />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });
});
