// Contopia — Book Store (Zustand)
// Manages books list, current book, and chapters
// Draft preservation removed in favor of IndexedDB autosave (STORY-019)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useBookStore = create(
  persist(
    (set, _get) => ({
      // Book list
      books: [],
      isLoadingBooks: false,
      booksError: null,

      // Current book
      currentBook: null,
      isLoadingBook: false,
      bookError: null,

      // Chapters
      chapters: [],
      isLoadingChapters: false,
      chaptersError: null,

      // Sort preference
      sortMode: 'recently-read',
      setSortMode: (sortMode) => set({ sortMode }),

      // Book list actions
      setBooks: (books) => set({ books, booksError: null }),
      setLoadingBooks: (isLoadingBooks) => set({ isLoadingBooks }),
      setBooksError: (booksError) => set({ booksError }),

      // Current book actions
      setCurrentBook: (currentBook) => set({ currentBook, bookError: null }),
      setLoadingBook: (isLoadingBook) => set({ isLoadingBook }),
      setBookError: (bookError) => set({ bookError }),

      // Chapter actions
      setChapters: (chapters) => set({ chapters, chaptersError: null }),
      setLoadingChapters: (isLoadingChapters) => set({ isLoadingChapters }),
      setChaptersError: (chaptersError) => set({ chaptersError }),
      addChapter: (chapter) =>
        set((state) => ({ chapters: [...state.chapters, chapter] })),
      removeChapter: (chapterId) =>
        set((state) => ({
          chapters: state.chapters.filter((c) => c._id !== chapterId),
        })),
      updateChapter: (chapterId, updates) =>
        set((state) => ({
          chapters: state.chapters.map((c) =>
            c._id === chapterId ? { ...c, ...updates } : c
          ),
        })),
      reorderChapters: (reorderedList) =>
        set({ chapters: reorderedList }),

      clearCurrentBook: () =>
        set({
          currentBook: null,
          chapters: [],
          bookError: null,
          chaptersError: null,
        }),

      clearAll: () =>
        set({
          books: [],
          currentBook: null,
          chapters: [],
          isLoadingBooks: false,
          booksError: null,
          isLoadingBook: false,
          bookError: null,
          isLoadingChapters: false,
          chaptersError: null,
        }),
    }),
    {
      name: 'contopia-sort-preference',
      partialize: (state) => ({ sortMode: state.sortMode }),
    }
  )
);

export default useBookStore;