import { create } from 'zustand';

const TOOLBAR_TIMEOUT_MS = 2000;

const useReaderStore = create((set, get) => ({
  currentChapterIndex: 0,
  isChapterDrawerOpen: false,
  isFullscreen: false,
  isToolbarVisible: false,
  toolbarTimeout: null,
  isSettingsOpen: false,
  fontSize: 'medium',
  theme: 'light',
  localProgress: null,
  syncStatus: 'idle',

  setCurrentChapterIndex: (idx) => set({ currentChapterIndex: idx }),
  openChapterDrawer: () => set({ isChapterDrawerOpen: true }),
  closeChapterDrawer: () => set({ isChapterDrawerOpen: false }),
  toggleChapterDrawer: () => set((s) => ({ isChapterDrawerOpen: !s.isChapterDrawerOpen })),

  enterFullscreen: () => set({ isFullscreen: true }),
  exitFullscreen: () => {
    const timeout = get().toolbarTimeout;
    if (timeout) clearTimeout(timeout);
    set({ isFullscreen: false, isToolbarVisible: false, isSettingsOpen: false, toolbarTimeout: null });
  },

  showToolbar: () => {
    const existingTimeout = get().toolbarTimeout;
    if (existingTimeout) clearTimeout(existingTimeout);
    const timeout = setTimeout(() => {
      set({ isToolbarVisible: false, toolbarTimeout: null });
    }, TOOLBAR_TIMEOUT_MS);
    set({ isToolbarVisible: true, toolbarTimeout: timeout });
  },

  hideToolbar: () => {
    const timeout = get().toolbarTimeout;
    if (timeout) clearTimeout(timeout);
    set({ isToolbarVisible: false, toolbarTimeout: null });
  },

  toggleToolbar: () => {
    const { isToolbarVisible, toolbarTimeout } = get();
    if (toolbarTimeout) clearTimeout(toolbarTimeout);
    if (isToolbarVisible) {
      set({ isToolbarVisible: false, toolbarTimeout: null });
    } else {
      const timeout = setTimeout(() => {
        set({ isToolbarVisible: false, toolbarTimeout: null });
      }, TOOLBAR_TIMEOUT_MS);
      set({ isToolbarVisible: true, toolbarTimeout: timeout });
    }
  },

  openSettings: () => {
    const timeout = get().toolbarTimeout;
    if (timeout) clearTimeout(timeout);
    set({ isSettingsOpen: true, isToolbarVisible: false, toolbarTimeout: null });
  },
  closeSettings: () => set({ isSettingsOpen: false }),

  setFontSize: (size) => set({ fontSize: size }),
  setTheme: (theme) => set({ theme }),

  setLocalProgress: (progress) => set({ localProgress: progress }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));

export default useReaderStore;