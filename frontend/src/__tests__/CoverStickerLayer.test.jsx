// Contopia — CoverStickerLayer Component Tests (STORY-024 §7.7)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoverStickerLayer from '../app/cover/CoverStickerLayer';
import { useCoverStore } from '../stores/cover-store';

describe('CoverStickerLayer', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders nothing when there are no stickers', () => {
    const { container } = render(<CoverStickerLayer textColor="#000000" />);
    // Should only have the sr-only aria-live region
    expect(container.querySelectorAll('.cover-sticker')).toHaveLength(0);
  });

  it('renders a CoverSticker for each sticker in the store', () => {
    const { addSticker } = useCoverStore.getState();
    addSticker('star');
    addSticker('heart');
    addSticker('moon');
    const { container } = render(<CoverStickerLayer textColor="#ffffff" />);
    expect(container.querySelectorAll('.cover-sticker')).toHaveLength(3);
  });

  it('passes textColor to CoverSticker', () => {
    const { addSticker } = useCoverStore.getState();
    addSticker('star');
    const { container } = render(<CoverStickerLayer textColor="#ff0000" />);
    const svgContainer = container.querySelector('.cover-sticker span');
    // The span in CoverSticker has inline style with the textColor
    expect(svgContainer).toBeInTheDocument();
    expect(svgContainer.style.color).toBe('rgb(255, 0, 0)');
  });

  it('renders an aria-live polite region for screen reader announcements', () => {
    render(<CoverStickerLayer textColor="#000000" />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion.className).toContain('sr-only');
  });

  it('renders 10 stickers when 10 are in the store', () => {
    const { addSticker } = useCoverStore.getState();
    for (let i = 0; i < 10; i++) {
      addSticker('star');
    }
    const { container } = render(<CoverStickerLayer textColor="#000000" />);
    expect(container.querySelectorAll('.cover-sticker')).toHaveLength(10);
  });
});
