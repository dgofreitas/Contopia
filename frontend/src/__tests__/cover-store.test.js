// Contopia — Cover Store Unit Tests (STORY-022)
import { describe, it, expect, beforeEach } from 'vitest';
import { useCoverStore } from '../stores/cover-store';

describe('useCoverStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCoverStore.setState({ selectedTemplateId: null });
  });

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

  it('resetStore resets selectedTemplateId to null', () => {
    const { setSelectedTemplate, resetStore } = useCoverStore.getState();
    setSelectedTemplate('nature');
    resetStore();
    expect(useCoverStore.getState().selectedTemplateId).toBeNull();
  });

  it('resetStore is idempotent when already null', () => {
    const { resetStore } = useCoverStore.getState();
    resetStore();
    expect(useCoverStore.getState().selectedTemplateId).toBeNull();
  });

  it('setSelectedTemplate accepts any string id', () => {
    const { setSelectedTemplate } = useCoverStore.getState();
    setSelectedTemplate('custom-template-123');
    expect(useCoverStore.getState().selectedTemplateId).toBe('custom-template-123');
  });

  it('setSelectedTemplate does not affect other potential future state keys', () => {
    const { setSelectedTemplate } = useCoverStore.getState();
    setSelectedTemplate('forest');
    const state = useCoverStore.getState();
    expect(state.selectedTemplateId).toBe('forest');
    // Only one key in store currently — verify no extra keys leaked
    expect(Object.keys(state)).toEqual(['selectedTemplateId', 'setSelectedTemplate', 'clearSelection', 'resetStore']);
  });
});
