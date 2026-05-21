import { create } from 'zustand';

export const useCoverStore = create((set) => ({
  selectedTemplateId: null,
  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  clearSelection: () => set({ selectedTemplateId: null }),
  resetStore: () => set({ selectedTemplateId: null }),
}));