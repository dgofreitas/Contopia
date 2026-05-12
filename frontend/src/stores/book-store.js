// Contopia — Book Store (Zustand)
// Manages books list, current book, chapters, and draft preservation
import { create } from 'zustand';

const useBookStore = create((set, get) => ({
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

  // Draft preservation
  draft: null,
  draftLastSavedAt: null,
  isDraftSaving: false,

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

  // Draft actions
  setDraft: (draft) => set({ draft }),
  setDraftLastSavedAt: (draftLastSavedAt) => set({ draftLastSavedAt }),
  setDraftSaving: (isDraftSaving) => set({ isDraftSaving }),

  saveDraft: (content) => {
    set({ draft: content, draftLastSavedAt: Date.now() });
  },

  clearDraft: () => set({ draft: null, draftLastSavedAt: null }),

  clearCurrentBook: () =>
    set({
      currentBook: null,
      chapters: [],
      draft: null,
      draftLastSavedAt: null,
      bookError: null,
      chaptersError: null,
    }),

  clearAll: () =>
    set({
      books: [],
      currentBook: null,
      chapters: [],
      draft: null,
      draftLastSavedAt: null,
      isLoadingBooks: false,
      booksError: null,
      isLoadingBook: false,
      bookError: null,
      isLoadingChapters: false,
      chaptersError: null,
      isDraftSaving: false,
    }),
}));

export default useBookStore;