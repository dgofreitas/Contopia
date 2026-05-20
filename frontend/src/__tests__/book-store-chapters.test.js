// Contopia — Book Store Chapter Actions Tests (STORY-017)
import { describe, it, expect, beforeEach } from 'vitest';
import useBookStore from '../stores/book-store';

describe('bookStore — Chapter Actions', () => {
  beforeEach(() => {
    useBookStore.getState().clearAll();
  });

  const sampleChapters = [
    { _id: 'c1', title: 'Chapter 1', order: 0 },
    { _id: 'c2', title: 'Chapter 2', order: 1 },
    { _id: 'c3', title: 'Chapter 3', order: 2 },
  ];

  describe('setChapters', () => {
    it('sets chapters and clears chaptersError', () => {
      useBookStore.getState().setChapters(sampleChapters);
      const state = useBookStore.getState();
      expect(state.chapters).toEqual(sampleChapters);
      expect(state.chaptersError).toBeNull();
    });
  });

  describe('addChapter', () => {
    it('appends a new chapter to the list', () => {
      useBookStore.getState().setChapters(sampleChapters);
      const newChapter = { _id: 'c4', title: 'Chapter 4', order: 3 };
      useBookStore.getState().addChapter(newChapter);

      expect(useBookStore.getState().chapters).toHaveLength(4);
      expect(useBookStore.getState().chapters[3]).toEqual(newChapter);
    });

    it('adds chapter to empty list', () => {
      const newChapter = { _id: 'c1', title: 'First Chapter', order: 0 };
      useBookStore.getState().addChapter(newChapter);

      expect(useBookStore.getState().chapters).toEqual([newChapter]);
    });
  });

  describe('removeChapter', () => {
    it('removes chapter by _id', () => {
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().removeChapter('c2');

      const chapters = useBookStore.getState().chapters;
      expect(chapters).toHaveLength(2);
      expect(chapters.find((c) => c._id === 'c2')).toBeUndefined();
    });

    it('does nothing when chapterId does not exist', () => {
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().removeChapter('nonexistent');

      expect(useBookStore.getState().chapters).toHaveLength(3);
    });

    it('removes the only chapter leaving empty list', () => {
      useBookStore.getState().setChapters([{ _id: 'c1', title: 'Solo', order: 0 }]);
      useBookStore.getState().removeChapter('c1');

      expect(useBookStore.getState().chapters).toEqual([]);
    });
  });

  describe('updateChapter', () => {
    it('updates chapter title by _id', () => {
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().updateChapter('c2', { title: 'Renamed Chapter' });

      const chapter = useBookStore.getState().chapters.find((c) => c._id === 'c2');
      expect(chapter.title).toBe('Renamed Chapter');
      expect(chapter.order).toBe(1); // unchanged
    });

    it('does nothing for nonexistent chapterId', () => {
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().updateChapter('nonexistent', { title: 'Nope' });

      expect(useBookStore.getState().chapters).toEqual(sampleChapters);
    });
  });

  describe('reorderChapters', () => {
    it('replaces chapters with reordered list', () => {
      useBookStore.getState().setChapters(sampleChapters);
      const reordered = [sampleChapters[2], sampleChapters[1], sampleChapters[0]];
      useBookStore.getState().reorderChapters(reordered);

      expect(useBookStore.getState().chapters).toEqual(reordered);
    });
  });

  describe('clearCurrentBook', () => {
    it('clears chapters and currentBook', () => {
      useBookStore.getState().setCurrentBook({ _id: 'b1', title: 'My Book' });
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().clearCurrentBook();

      const state = useBookStore.getState();
      expect(state.currentBook).toBeNull();
      expect(state.chapters).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('resets all state to initial values', () => {
      useBookStore.getState().setBooks([{ _id: 'b1' }]);
      useBookStore.getState().setChapters(sampleChapters);
      useBookStore.getState().clearAll();

      const state = useBookStore.getState();
      expect(state.books).toEqual([]);
      expect(state.chapters).toEqual([]);
      expect(state.currentBook).toBeNull();
      expect(state.isLoadingBooks).toBe(false);
    });
  });

  // === Loading/error setters (uncovered functions) ===

  describe('setLoadingBooks', () => {
    it('sets isLoadingBooks to true', () => {
      useBookStore.getState().setLoadingBooks(true);
      expect(useBookStore.getState().isLoadingBooks).toBe(true);
    });

    it('sets isLoadingBooks to false', () => {
      useBookStore.getState().setLoadingBooks(true);
      useBookStore.getState().setLoadingBooks(false);
      expect(useBookStore.getState().isLoadingBooks).toBe(false);
    });
  });

  describe('setBooksError', () => {
    it('sets booksError to an error message', () => {
      useBookStore.getState().setBooksError('Failed to load books');
      expect(useBookStore.getState().booksError).toBe('Failed to load books');
    });

    it('clears booksError with null', () => {
      useBookStore.getState().setBooksError('Some error');
      useBookStore.getState().setBooksError(null);
      expect(useBookStore.getState().booksError).toBeNull();
    });
  });

  describe('setLoadingBook', () => {
    it('sets isLoadingBook to true', () => {
      useBookStore.getState().setLoadingBook(true);
      expect(useBookStore.getState().isLoadingBook).toBe(true);
    });

    it('sets isLoadingBook to false', () => {
      useBookStore.getState().setLoadingBook(false);
      expect(useBookStore.getState().isLoadingBook).toBe(false);
    });
  });

  describe('setBookError', () => {
    it('sets bookError to an error message', () => {
      useBookStore.getState().setBookError('Book not found');
      expect(useBookStore.getState().bookError).toBe('Book not found');
    });

    it('clears bookError with null', () => {
      useBookStore.getState().setBookError(null);
      expect(useBookStore.getState().bookError).toBeNull();
    });
  });

  describe('setLoadingChapters', () => {
    it('sets isLoadingChapters to true', () => {
      useBookStore.getState().setLoadingChapters(true);
      expect(useBookStore.getState().isLoadingChapters).toBe(true);
    });

    it('sets isLoadingChapters to false', () => {
      useBookStore.getState().setLoadingChapters(false);
      expect(useBookStore.getState().isLoadingChapters).toBe(false);
    });
  });

  describe('setChaptersError', () => {
    it('sets chaptersError to an error message', () => {
      useBookStore.getState().setChaptersError('Failed to load chapters');
      expect(useBookStore.getState().chaptersError).toBe('Failed to load chapters');
    });

    it('clears chaptersError with null', () => {
      useBookStore.getState().setChaptersError(null);
      expect(useBookStore.getState().chaptersError).toBeNull();
    });
  });

  // === Draft actions removed (STORY-019: replaced by IndexedDB autosave) ===
});
