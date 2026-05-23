import { create } from 'zustand';
import { deriveSpineColor } from '../lib/spine-color-utils';

export const useCoverStore = create((set, get) => ({
  selectedTemplateId: null,
  baseColor: null,
  patternId: null,
  spineColor: null,
  spineCustomized: false,

  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  setBaseColor: (hex) => set({ baseColor: hex }),
  setPattern: (id) => set({ patternId: id }),
  setSpineColor: (hex) => set({ spineColor: hex }),
  setSpineCustomized: (bool) => set({ spineCustomized: bool }),

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
    }),

  clearSelection: () => set({ selectedTemplateId: null }),
  resetStore: () =>
    set({
      selectedTemplateId: null,
      baseColor: null,
      patternId: null,
      spineColor: null,
      spineCustomized: false,
    }),
}));
