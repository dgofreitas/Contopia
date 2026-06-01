import { create } from 'zustand';

export const useErrorStore = create((set, get) => ({
  toasts: [],
  isOffline: false,

  addToast: (code, message, action) => {
    const now = Date.now();
    const toasts = get().toasts;

    const recent = toasts.filter((t) => now - t.timestamp < 500);
    if (recent.some((t) => t.code === code)) return;

    const id = crypto.randomUUID();
    const newToast = { id, code, message, action, timestamp: now };

    set({ toasts: [...toasts.slice(-2), newToast] });

    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 5000);
  },

  removeToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  setOffline: (isOffline) => {
    const wasOffline = get().isOffline;
    set({ isOffline });
    if (wasOffline && !isOffline) {
      get().addToast('BACK_ONLINE', null);
    }
  },

  clearAll: () => set({ toasts: [] }),
}));