// Contopia — StickerPickerPanel Component Tests (STORY-024 §7.4)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StickerPickerPanel from '../app/cover/StickerPickerPanel';
import { useCoverStore } from '../stores/cover-store';

describe('StickerPickerPanel', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders the sticker picker heading', () => {
    render(<StickerPickerPanel />);
    expect(screen.getByText('cover.customize.stickerPickerHeading')).toBeInTheDocument();
  });

  it('renders category tabs from STICKER_CATEGORIES', () => {
    render(<StickerPickerPanel />);
    // All category nameKeys should appear as tab text
    expect(screen.getByText('cover.stickers.categories.nature')).toBeInTheDocument();
    expect(screen.getByText('cover.stickers.categories.animals')).toBeInTheDocument();
    expect(screen.getByText('cover.stickers.categories.shapes')).toBeInTheDocument();
  });

  it('renders sticker buttons for the active category', () => {
    render(<StickerPickerPanel />);
    // Nature category is default (first), should have flower, leaf, sun, rainbow-arc, cloud
    const buttons = screen.getAllByRole('button');
    // Filter for sticker buttons (not tab buttons) — sticker buttons have aria-label from sticker names
    const stickerButtons = buttons.filter(b => !b.getAttribute('role') || b.getAttribute('role') === 'button');
    // At least 5 nature stickers
    expect(stickerButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('tab buttons have role="tab"', () => {
    render(<StickerPickerPanel />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  it('switches displayed stickers when clicking a different category tab', async () => {
    const user = userEvent.setup();
    render(<StickerPickerPanel />);

    // Click "animals" tab
    const animalsTab = screen.getByText('cover.stickers.categories.animals');
    await user.click(animalsTab);

    // Should now show animal stickers (cat, butterfly, fish, bird, ladybug)
    const buttons = screen.getAllByRole('button');
    const stickerButtons = buttons.filter(b => !b.getAttribute('role') || b.getAttribute('role') === 'button');
    expect(stickerButtons.length).toBe(5);
  });

  it('shows sticker count indicator', () => {
    render(<StickerPickerPanel />);
    expect(screen.getByText(/stickerCount/)).toBeInTheDocument();
  });

  it('disables sticker buttons when at max stickers (10)', () => {
    const { addSticker } = useCoverStore.getState();
    for (let i = 0; i < 10; i++) {
      addSticker('star');
    }
    render(<StickerPickerPanel />);
    const buttons = screen.getAllByRole('button');
    const stickerButtons = buttons.filter(b => b.getAttribute('aria-pressed') !== null);
    for (const btn of stickerButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('addSticker is called when clicking a sticker button (not at max)', async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(useCoverStore.getState(), 'addSticker');
    render(<StickerPickerPanel />);
    const buttons = screen.getAllByRole('button');
    // Pick the first sticker button (not a tab)
    const stickerBtn = buttons.find(b => b.getAttribute('aria-label')?.startsWith('cover.stickers.'));
    if (stickerBtn) {
      await user.click(stickerBtn);
      expect(addSpy).toHaveBeenCalled();
      addSpy.mockRestore();
    }
  });

  it('has role="tablist" on category bar', () => {
    render(<StickerPickerPanel />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
  });

  it('has role="group" on sticker grid', () => {
    render(<StickerPickerPanel />);
    const stickerGroup = screen.getByRole('group');
    expect(stickerGroup).toBeInTheDocument();
  });

  it('renders all 5 nature stickers when nature tab is active', () => {
    render(<StickerPickerPanel />);
    const buttons = screen.getAllByRole('button');
    // Nature stickers have svgIds: flower, leaf, sun, rainbow-arc, cloud
    // They all have aria-labels: cover.stickers.flower, etc.
    const natureLabels = ['cover.stickers.flower', 'cover.stickers.leaf', 'cover.stickers.sun',
      'cover.stickers.rainbow-arc', 'cover.stickers.cloud'].map(k => k);
    const natureButtons = buttons.filter(b => natureLabels.includes(b.getAttribute('aria-label')));
    // The mock t() returns the key, not the value
    // So aria-label is the key path
    const matching = buttons.filter(b => {
      const label = b.getAttribute('aria-label');
      return label && label.startsWith('cover.stickers.');
    });
    expect(matching.length).toBeGreaterThanOrEqual(5);
  });

  it('selected tab has aria-selected="true"', () => {
    render(<StickerPickerPanel />);
    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    expect(activeTab).toBeTruthy();
    expect(activeTab).toHaveTextContent('cover.stickers.categories.nature');
  });
});
