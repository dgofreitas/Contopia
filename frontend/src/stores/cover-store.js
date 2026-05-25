import { create } from 'zustand';
import { deriveSpineColor } from '../lib/spine-color-utils';
import { generateId } from '../lib/sticker-library.jsx';

export const useCoverStore = create((set, get) => ({
  selectedTemplateId: null,
  baseColor: null,
  patternId: null,
  spineColor: null,
  spineCustomized: false,
  stickers: [],
  coverTitle: null,
  selectedStickerId: null,

  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  setBaseColor: (hex) => set({ baseColor: hex }),
  setPattern: (id) => set({ patternId: id }),
  setSpineColor: (hex) => set({ spineColor: hex }),
  setSpineCustomized: (bool) => set({ spineCustomized: bool }),

  addSticker: (svgId) => {
    const { stickers } = get();
    if (stickers.length >= 10) return;
    const id = generateId();
    set({
      stickers: [...stickers, { id, svgId, x: 50, y: 50, scale: 1 }],
      selectedStickerId: id,
    });
  },

  removeSticker: (id) => {
    const { stickers, selectedStickerId } = get();
    set({
      stickers: stickers.filter((s) => s.id !== id),
      selectedStickerId: selectedStickerId === id ? null : selectedStickerId,
    });
  },

  moveSticker: (id, x, y) => {
    set({
      stickers: get().stickers.map((s) =>
        s.id === id ? { ...s, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : s
      ),
    });
  },

  setScale: (id, scale) => {
    const clampedScale = Math.max(0.5, Math.min(2, scale));
    set({
      stickers: get().stickers.map((s) =>
        s.id === id ? { ...s, scale: clampedScale } : s
      ),
    });
  },

  setCoverTitle: (text) => set({ coverTitle: text }),

  selectSticker: (id) => set({ selectedStickerId: id }),
  deselectSticker: () => set({ selectedStickerId: null }),

  clearStickers: () => set({ stickers: [], selectedStickerId: null }),

  setStoreStickers: (newStickers) => set({ stickers: newStickers }),

  getEffectiveSpineColor: () => {
    const { spineCustomized, spineColor, baseColor, selectedTemplateId } = get();
    if (spineCustomized && spineColor) {
      return spineColor;
    }
    if (baseColor) {
      return baseColor;
    }
    if (selectedTemplateId) {
      return deriveSpineColor({ coverColor: null, template: selectedTemplateId });
    }
    return null;
  },

  resetCustomization: () =>
    set({
      baseColor: null,
      patternId: null,
      spineColor: null,
      spineCustomized: false,
      stickers: [],
      coverTitle: null,
      selectedStickerId: null,
    }),

  clearSelection: () => set({ selectedTemplateId: null }),
  resetStore: () =>
    set({
      selectedTemplateId: null,
      baseColor: null,
      patternId: null,
      spineColor: null,
      spineCustomized: false,
      stickers: [],
      coverTitle: null,
      selectedStickerId: null,
    }),
}));