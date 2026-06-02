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
      sortGeneration: 0,
      setSortMode: (sortMode) => set((state) => ({ sortMode, sortGeneration: state.sortGeneration + 1 })),

      // Offline state
      isOffline: false,
      setIsOffline: (isOffline) => set({ isOffline }),

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

      createChapterOffline: async ({ bookId, title, content }) => {
        const tempId = crypto.randomUUID();
        const tempChapter = {
          _id: tempId,
          bookId,
          title: title || `Chapter ${_get().chapters.length + 1}`,
          content: content || '',
          order: _get().chapters.length,
          isLocalOnly: true,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          chapters: [...state.chapters, tempChapter],
        }));

        try {
          const { queueSyncOp } = await import('../services/sync-service.js');
          const { putChapter } = await import('../services/offline-db-service.js');

          await putChapter({
            chapterId: tempId,
            bookId,
            title: tempChapter.title,
            content: tempChapter.content,
            isLocalOnly: true,
            updatedAt: Date.now(),
          });

          await queueSyncOp({
            type: 'chapter.create',
            bookId,
            title: tempChapter.title,
            content: tempChapter.content,
            clientTimestamp: new Date().toISOString(),
            tempChapterId: tempId,
          });
        } catch (err) {
          console.warn('[bookStore] Failed to queue offline chapter creation:', err);
        }

        return tempChapter;
      },

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
          isOffline: false,
        }),
    }),
    {
      name: 'contopia-sort-preference',
      partialize: (state) => ({ sortMode: state.sortMode }),
    }
  )
);

export default useBookStore;