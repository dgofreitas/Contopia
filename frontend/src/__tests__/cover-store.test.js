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

  // STORY-024: Sticker & Cover Title Tests
  describe('STORY-024: Sticker & Cover Title', () => {
    it('initializes with empty stickers, null coverTitle, null selectedStickerId', () => {
      const state = useCoverStore.getState();
      expect(state.stickers).toEqual([]);
      expect(state.coverTitle).toBeNull();
      expect(state.selectedStickerId).toBeNull();
    });

    describe('addSticker', () => {
      it('adds a sticker at center (50,50) with scale 1', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const state = useCoverStore.getState();
        expect(state.stickers).toHaveLength(1);
        const sticker = state.stickers[0];
        expect(sticker.svgId).toBe('star');
        expect(sticker.x).toBe(50);
        expect(sticker.y).toBe(50);
        expect(sticker.scale).toBe(1);
        expect(sticker.id).toBeDefined();
        expect(typeof sticker.id).toBe('string');
      });

      it('selects the newly added sticker', () => {
        const state = useCoverStore.getState();
        const { addSticker } = state;
        addSticker('star');
        const nextState = useCoverStore.getState();
        expect(nextState.selectedStickerId).toBe(nextState.stickers[0].id);
      });

      it('does not add a sticker if already at max (10)', () => {
        const store = useCoverStore.getState();
        for (let i = 0; i < 10; i++) {
          store.addSticker('star');
        }
        expect(useCoverStore.getState().stickers).toHaveLength(10);
        useCoverStore.getState().addSticker('heart');
        expect(useCoverStore.getState().stickers).toHaveLength(10);
      });

      it('allows adding up to exactly 10 stickers', () => {
        const { addSticker } = useCoverStore.getState();
        for (let i = 0; i < 10; i++) {
          addSticker('star');
        }
        const state = useCoverStore.getState();
        expect(state.stickers).toHaveLength(10);
      });
    });

    describe('removeSticker', () => {
      it('removes a sticker by id', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().removeSticker(sticker.id);
        expect(useCoverStore.getState().stickers).toHaveLength(0);
      });

      it('deselects when removed sticker was selected', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        expect(useCoverStore.getState().selectedStickerId).toBe(sticker.id);
        useCoverStore.getState().removeSticker(sticker.id);
        expect(useCoverStore.getState().selectedStickerId).toBeNull();
      });

      it('does not deselect another sticker when removing a different one', () => {
        const { addSticker, selectSticker, removeSticker } = useCoverStore.getState();
        addSticker('star');
        addSticker('heart');
        const starSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'star');
        const heartSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'heart');
        selectSticker(heartSticker.id);
        removeSticker(starSticker.id);
        expect(useCoverStore.getState().selectedStickerId).toBe(heartSticker.id);
      });

      it('is idempotent — removing non-existent id does nothing', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        useCoverStore.getState().removeSticker('nonexistent-id');
        expect(useCoverStore.getState().stickers).toHaveLength(1);
      });
    });

    describe('moveSticker', () => {
      it('updates sticker position within bounds', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().moveSticker(sticker.id, 30, 60);
        const updated = useCoverStore.getState().stickers[0];
        expect(updated.x).toBe(30);
        expect(updated.y).toBe(60);
      });

      it('clamps x to 0–100', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().moveSticker(sticker.id, -10, 50);
        expect(useCoverStore.getState().stickers[0].x).toBe(0);
        useCoverStore.getState().moveSticker(sticker.id, 150, 50);
        expect(useCoverStore.getState().stickers[0].x).toBe(100);
      });

      it('clamps y to 0–100', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().moveSticker(sticker.id, 50, -20);
        expect(useCoverStore.getState().stickers[0].y).toBe(0);
        useCoverStore.getState().moveSticker(sticker.id, 50, 120);
        expect(useCoverStore.getState().stickers[0].y).toBe(100);
      });

      it('only updates the targeted sticker', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        addSticker('heart');
        const starSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'star');
        const heartSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'heart');
        useCoverStore.getState().moveSticker(starSticker.id, 10, 20);
        const state = useCoverStore.getState();
        expect(state.stickers.find(s => s.id === starSticker.id).x).toBe(10);
        expect(state.stickers.find(s => s.id === heartSticker.id).x).toBe(50);
      });
    });

    describe('setScale', () => {
      it('updates sticker scale', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().setScale(sticker.id, 1.5);
        expect(useCoverStore.getState().stickers[0].scale).toBe(1.5);
      });

      it('clamps scale to 0.5–2.0', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        const sticker = useCoverStore.getState().stickers[0];
        useCoverStore.getState().setScale(sticker.id, 0.1);
        expect(useCoverStore.getState().stickers[0].scale).toBe(0.5);
        useCoverStore.getState().setScale(sticker.id, 5);
        expect(useCoverStore.getState().stickers[0].scale).toBe(2);
      });

      it('only updates the targeted sticker scale', () => {
        const { addSticker } = useCoverStore.getState();
        addSticker('star');
        addSticker('heart');
        const starSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'star');
        const heartSticker = useCoverStore.getState().stickers.find(s => s.svgId === 'heart');
        useCoverStore.getState().setScale(starSticker.id, 0.5);
        const state = useCoverStore.getState();
        expect(state.stickers.find(s => s.id === starSticker.id).scale).toBe(0.5);
        expect(state.stickers.find(s => s.id === heartSticker.id).scale).toBe(1);
      });
    });

    describe('setCoverTitle', () => {
      it('sets coverTitle to a string', () => {
        const { setCoverTitle } = useCoverStore.getState();
        setCoverTitle('My Custom Title');
        expect(useCoverStore.getState().coverTitle).toBe('My Custom Title');
      });

      it('sets coverTitle to null', () => {
        const { setCoverTitle } = useCoverStore.getState();
        setCoverTitle('Something');
        setCoverTitle(null);
        expect(useCoverStore.getState().coverTitle).toBeNull();
      });

      it('overwrites previous value', () => {
        const { setCoverTitle } = useCoverStore.getState();
        setCoverTitle('First');
        setCoverTitle('Second');
        expect(useCoverStore.getState().coverTitle).toBe('Second');
      });
    });

    describe('selectSticker / deselectSticker', () => {
      it('selectSticker sets selectedStickerId', () => {
        const { selectSticker } = useCoverStore.getState();
        selectSticker('some-id');
        expect(useCoverStore.getState().selectedStickerId).toBe('some-id');
      });

      it('deselectSticker clears selectedStickerId', () => {
        const { selectSticker, deselectSticker } = useCoverStore.getState();
        selectSticker('some-id');
        deselectSticker();
        expect(useCoverStore.getState().selectedStickerId).toBeNull();
      });
    });

    describe('clearStickers', () => {
      it('removes all stickers and clears selection', () => {
        const { addSticker, clearStickers } = useCoverStore.getState();
        addSticker('star');
        addSticker('heart');
        addSticker('moon');
        clearStickers();
        const state = useCoverStore.getState();
        expect(state.stickers).toEqual([]);
        expect(state.selectedStickerId).toBeNull();
      });

      it('is idempotent when already empty', () => {
        const { clearStickers } = useCoverStore.getState();
        clearStickers();
        expect(useCoverStore.getState().stickers).toEqual([]);
      });
    });

    describe('setStoreStickers', () => {
      it('sets stickers from an external source (e.g. API response)', () => {
        const { setStoreStickers } = useCoverStore.getState();
        const external = [
          { id: 'a1', svgId: 'star', x: 20, y: 30, scale: 1 },
          { id: 'a2', svgId: 'heart', x: 70, y: 60, scale: 1.5 },
        ];
        setStoreStickers(external);
        expect(useCoverStore.getState().stickers).toEqual(external);
      });
    });

    describe('resetCustomization with stickers', () => {
      it('clears stickers, coverTitle, and selectedStickerId but keeps template', () => {
        const { setSelectedTemplate, addSticker, setCoverTitle, resetCustomization } = useCoverStore.getState();
        setSelectedTemplate('galaxy');
        addSticker('star');
        setCoverTitle('Mine');
        resetCustomization();
        const state = useCoverStore.getState();
        expect(state.selectedTemplateId).toBe('galaxy');
        expect(state.stickers).toEqual([]);
        expect(state.coverTitle).toBeNull();
        expect(state.selectedStickerId).toBeNull();
      });
    });

    describe('resetStore with stickers', () => {
      it('clears all state including stickers and coverTitle', () => {
        const { setSelectedTemplate, addSticker, setCoverTitle, resetStore } = useCoverStore.getState();
        setSelectedTemplate('galaxy');
        addSticker('star');
        setCoverTitle('Mine');
        resetStore();
        const state = useCoverStore.getState();
        expect(state.selectedTemplateId).toBeNull();
        expect(state.stickers).toEqual([]);
        expect(state.coverTitle).toBeNull();
        expect(state.selectedStickerId).toBeNull();
      });
    });
  });

  // STORY-027 Tests: Cover Image Upload
  describe('STORY-027: Cover Image Upload', () => {
    beforeEach(() => {
      useCoverStore.getState().resetStore();
    });

    describe('setCoverImage / clearCoverImage', () => {
      it('initializes with coverImage as null', () => {
        expect(useCoverStore.getState().coverImage).toBeNull();
      });

      it('setCoverImage stores image data', () => {
        const coverData = {
          assetId: 'asset-123',
          thumbnailUrl: 'https://s3.example.com/thumb.jpg',
          fullUrl: 'https://s3.example.com/full.jpg',
          dominantColor: '#4a9b6e',
        };
        useCoverStore.getState().setCoverImage(coverData);
        expect(useCoverStore.getState().coverImage).toEqual(coverData);
      });

      it('setCoverImage overwrites previous image data', () => {
        useCoverStore.getState().setCoverImage({
          assetId: 'old',
          thumbnailUrl: 'old.jpg',
          fullUrl: 'old.jpg',
        });
        useCoverStore.getState().setCoverImage({
          assetId: 'new',
          thumbnailUrl: 'new.jpg',
          fullUrl: 'new.jpg',
          dominantColor: '#000000',
        });
        expect(useCoverStore.getState().coverImage.assetId).toBe('new');
      });

      it('clearCoverImage resets coverImage to null', () => {
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          thumbnailUrl: 'thumb.jpg',
          fullUrl: 'full.jpg',
        });
        useCoverStore.getState().clearCoverImage();
        expect(useCoverStore.getState().coverImage).toBeNull();
      });

      it('clearCoverImage is idempotent when already null', () => {
        useCoverStore.getState().clearCoverImage();
        expect(useCoverStore.getState().coverImage).toBeNull();
      });
    });

    describe('upload state management', () => {
      it('initializes with isUploading as false', () => {
        expect(useCoverStore.getState().isUploading).toBe(false);
      });

      it('initializes with uploadProgress as 0', () => {
        expect(useCoverStore.getState().uploadProgress).toBe(0);
      });

      it('initializes with uploadError as null', () => {
        expect(useCoverStore.getState().uploadError).toBeNull();
      });

      it('setUploadProgress updates progress', () => {
        useCoverStore.getState().setUploadProgress(50);
        expect(useCoverStore.getState().uploadProgress).toBe(50);
      });

      it('setUploadProgress handles 0 and 100', () => {
        useCoverStore.getState().setUploadProgress(0);
        expect(useCoverStore.getState().uploadProgress).toBe(0);
        useCoverStore.getState().setUploadProgress(100);
        expect(useCoverStore.getState().uploadProgress).toBe(100);
      });

      it('setUploadError stores error code', () => {
        useCoverStore.getState().setUploadError('FILE_TOO_LARGE');
        expect(useCoverStore.getState().uploadError).toBe('FILE_TOO_LARGE');
      });

      it('setUploadError with null clears error', () => {
        useCoverStore.getState().setUploadError('UPLOAD_FAILED');
        useCoverStore.getState().setUploadError(null);
        expect(useCoverStore.getState().uploadError).toBeNull();
      });
    });

    describe('getEffectiveSpineColor with coverImage dominantColor fallback', () => {
      it('returns coverImage dominantColor when no baseColor or spineColor set', () => {
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          dominantColor: '#4a9b6e',
        });
        expect(useCoverStore.getState().getEffectiveSpineColor()).toBe('#4a9b6e');
      });

      it('returns spineColor when spineCustomized (takes priority over coverImage)', () => {
        useCoverStore.getState().setSpineColor('#ff0000');
        useCoverStore.getState().setSpineCustomized(true);
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          dominantColor: '#4a9b6e',
        });
        expect(useCoverStore.getState().getEffectiveSpineColor()).toBe('#ff0000');
      });

      it('returns baseColor when set (takes priority over coverImage)', () => {
        useCoverStore.getState().setBaseColor('#00ff00');
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          dominantColor: '#4a9b6e',
        });
        expect(useCoverStore.getState().getEffectiveSpineColor()).toBe('#00ff00');
      });

      it('returns null when coverImage has no dominantColor and no other color set', () => {
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          // no dominantColor
        });
        expect(useCoverStore.getState().getEffectiveSpineColor()).toBeNull();
      });
    });

    describe('resetCustomization clears coverImage', () => {
      it('clears coverImage, isUploading, uploadProgress, uploadError but keeps template', () => {
        useCoverStore.getState().setSelectedTemplate('galaxy');
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          thumbnailUrl: 'thumb.jpg',
          fullUrl: 'full.jpg',
        });
        useCoverStore.getState().setUploadProgress(75);
        useCoverStore.getState().setUploadError(null);

        useCoverStore.getState().resetCustomization();

        const state = useCoverStore.getState();
        expect(state.selectedTemplateId).toBe('galaxy');
        expect(state.coverImage).toBeNull();
        expect(state.uploadProgress).toBe(0);
        expect(state.uploadError).toBeNull();
      });
    });

    describe('resetStore clears coverImage', () => {
      it('clears coverImage related state', () => {
        useCoverStore.getState().setCoverImage({
          assetId: 'asset-123',
          thumbnailUrl: 'thumb.jpg',
          fullUrl: 'full.jpg',
        });
        useCoverStore.getState().setUploadProgress(100);
        useCoverStore.getState().setUploadError(null);

        useCoverStore.getState().resetStore();

        const state = useCoverStore.getState();
        expect(state.coverImage).toBeNull();
        expect(state.isUploading).toBe(false);
        expect(state.uploadProgress).toBe(0);
        expect(state.uploadError).toBeNull();
      });
    });
  });
});


