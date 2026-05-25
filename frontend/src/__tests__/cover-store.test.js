// Contopia — Cover Store Unit Tests (STORY-022 + STORY-023)
import { describe, it, expect, beforeEach } from 'vitest';
import { useCoverStore } from '../stores/cover-store';

describe('useCoverStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCoverStore.getState().resetStore();
  });

  // STORY-022 Tests
  describe('STORY-022: Template Selection', () => {

  it('initializes with selectedTemplateId as null', () => {
    const state = useCoverStore.getState();
    expect(state.selectedTemplateId).toBeNull();
  });

  it('setSelectedTemplate updates selectedTemplateId', () => {
    const { setSelectedTemplate } = useCoverStore.getState();
    setSelectedTemplate('galaxy');
    expect(useCoverStore.getState().selectedTemplateId).toBe('galaxy');
  });

  it('setSelectedTemplate overwrites previous selection', () => {
    const { setSelectedTemplate } = useCoverStore.getState();
    setSelectedTemplate('galaxy');
    setSelectedTemplate('ocean');
    expect(useCoverStore.getState().selectedTemplateId).toBe('ocean');
  });

  it('clearSelection resets selectedTemplateId to null after selection', () => {
    const { setSelectedTemplate, clearSelection } = useCoverStore.getState();
    setSelectedTemplate('adventure');
    clearSelection();
    expect(useCoverStore.getState().selectedTemplateId).toBeNull();
  });

  it('clearSelection is idempotent when already null', () => {
    const { clearSelection } = useCoverStore.getState();
    clearSelection();
    expect(useCoverStore.getState().selectedTemplateId).toBeNull();
  });

  it('setSelectedTemplate accepts any string id', () => {
    const { setSelectedTemplate } = useCoverStore.getState();
    setSelectedTemplate('custom-template-123');
    expect(useCoverStore.getState().selectedTemplateId).toBe('custom-template-123');
  });
  });

  // STORY-023 Tests
  describe('STORY-023: Color & Pattern Customization', () => {
    it('initializes with baseColor, patternId, spineColor as null and spineCustomized as false', () => {
      const state = useCoverStore.getState();
      expect(state.baseColor).toBeNull();
      expect(state.patternId).toBeNull();
      expect(state.spineColor).toBeNull();
      expect(state.spineCustomized).toBe(false);
    });

    it('setBaseColor updates baseColor with valid hex', () => {
      const { setBaseColor } = useCoverStore.getState();
      setBaseColor('#FF6B6B');
      expect(useCoverStore.getState().baseColor).toBe('#FF6B6B');
    });

    it('setBaseColor overwrites previous baseColor', () => {
      const { setBaseColor } = useCoverStore.getState();
      setBaseColor('#FF6B6B');
      setBaseColor('#87CEEB');
      expect(useCoverStore.getState().baseColor).toBe('#87CEEB');
    });

    it('setBaseColor accepts null to reset', () => {
      const { setBaseColor } = useCoverStore.getState();
      setBaseColor('#FF6B6B');
      setBaseColor(null);
      expect(useCoverStore.getState().baseColor).toBeNull();
    });

    it('setPattern updates patternId', () => {
      const { setPattern } = useCoverStore.getState();
      setPattern('stripes');
      expect(useCoverStore.getState().patternId).toBe('stripes');
    });

    it('setPattern overwrites previous patternId', () => {
      const { setPattern } = useCoverStore.getState();
      setPattern('stripes');
      setPattern('dots');
      expect(useCoverStore.getState().patternId).toBe('dots');
    });

    it('setPattern accepts null to reset', () => {
      const { setPattern } = useCoverStore.getState();
      setPattern('stripes');
      setPattern(null);
      expect(useCoverStore.getState().patternId).toBeNull();
    });

    it('setSpineColor updates spineColor', () => {
      const { setSpineColor } = useCoverStore.getState();
      setSpineColor('#4B5563');
      expect(useCoverStore.getState().spineColor).toBe('#4B5563');
    });

    it('setSpineCustomized updates spineCustomized flag', () => {
      const { setSpineCustomized } = useCoverStore.getState();
      setSpineCustomized(true);
      expect(useCoverStore.getState().spineCustomized).toBe(true);
      setSpineCustomized(false);
      expect(useCoverStore.getState().spineCustomized).toBe(false);
    });

    it('resetCustomization clears color and pattern state but keeps template', () => {
      const { setSelectedTemplate, setBaseColor, setPattern, setSpineColor, setSpineCustomized, resetCustomization } = useCoverStore.getState();
      setSelectedTemplate('galaxy');
      setBaseColor('#FF6B6B');
      setPattern('stripes');
      setSpineColor('#4B5563');
      setSpineCustomized(true);

      resetCustomization();

      const state = useCoverStore.getState();
      expect(state.selectedTemplateId).toBe('galaxy');
      expect(state.baseColor).toBeNull();
      expect(state.patternId).toBeNull();
      expect(state.spineColor).toBeNull();
      expect(state.spineCustomized).toBe(false);
    });

    it('resetStore clears all state including template, color, and pattern', () => {
      const { setSelectedTemplate, setBaseColor, setPattern, setSpineColor, setSpineCustomized, resetStore } = useCoverStore.getState();
      setSelectedTemplate('galaxy');
      setBaseColor('#FF6B6B');
      setPattern('stripes');
      setSpineColor('#4B5563');
      setSpineCustomized(true);

      resetStore();

      const state = useCoverStore.getState();
      expect(state.selectedTemplateId).toBeNull();
      expect(state.baseColor).toBeNull();
      expect(state.patternId).toBeNull();
      expect(state.spineColor).toBeNull();
      expect(state.spineCustomized).toBe(false);
    });

    it('getEffectiveSpineColor returns spineColor when spineCustomized is true', () => {
      const { setBaseColor, setSpineColor, setSpineCustomized } = useCoverStore.getState();
      setBaseColor('#FF6B6B');
      setSpineColor('#4B5563');
      setSpineCustomized(true);

      const state = useCoverStore.getState();
      expect(state.getEffectiveSpineColor()).toBe('#4B5563');
    });

    it('getEffectiveSpineColor returns baseColor when spineCustomized is false', () => {
      const { setBaseColor, setSpineColor, setSpineCustomized } = useCoverStore.getState();
      setBaseColor('#FF6B6B');
      setSpineColor('#4B5563');
      setSpineCustomized(false);

      const state = useCoverStore.getState();
      expect(state.getEffectiveSpineColor()).toBe('#FF6B6B');
    });

    it('getEffectiveSpineColor returns null when no color is set', () => {
      const state = useCoverStore.getState();
      expect(state.getEffectiveSpineColor()).toBeNull();
    });
  });
});
