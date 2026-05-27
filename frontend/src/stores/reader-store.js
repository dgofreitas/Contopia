import { create } from 'zustand';

const useReaderStore = create((set) => ({
  currentChapterIndex: 0,
  isChapterDrawerOpen: false,

  setCurrentChapterIndex: (idx) => set({ currentChapterIndex: idx }),
  openChapterDrawer: () => set({ isChapterDrawerOpen: true }),
  closeChapterDrawer: () => set({ isChapterDrawerOpen: false }),
  toggleChapterDrawer: () => set((s) => ({ isChapterDrawerOpen: !s.isChapterDrawerOpen })),
}));

export default useReaderStore;