// Contopia — StickerActions Component Tests (STORY-024)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StickerActions from '../app/cover/StickerActions';
import { useCoverStore } from '../stores/cover-store';

describe('StickerActions', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders nothing when no stickers and no selection', () => {
    const { container } = render(<StickerActions />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when there are stickers but no selection', () => {
    useCoverStore.getState().addSticker('star');
    const { container } = render(<StickerActions />);
    // Should render clear all (since stickers.length > 0)
    expect(screen.queryByText('cover.customize.clearAllStickers')).toBeInTheDocument();
  });

  it('renders Remove button when a sticker is selected', () => {
    useCoverStore.getState().addSticker('star');
    const sticker = useCoverStore.getState().stickers[0];
    useCoverStore.getState().selectSticker(sticker.id);
    render(<StickerActions />);
    expect(screen.getByText('cover.customize.removeSticker')).toBeInTheDocument();
  });

  it('Remove button is disabled when no sticker selected', () => {
    useCoverStore.getState().addSticker('star');
    useCoverStore.getState().deselectSticker();
    render(<StickerActions />);
    const removeBtn = screen.getByText('cover.customize.removeSticker').closest('button');
    expect(removeBtn).toBeDisabled();
  });

  it('Remove button is enabled when a sticker is selected', () => {
    useCoverStore.getState().addSticker('star');
    const sticker = useCoverStore.getState().stickers[0];
    useCoverStore.getState().selectSticker(sticker.id);
    render(<StickerActions />);
    const removeBtn = screen.getByText('cover.customize.removeSticker').closest('button');
    expect(removeBtn).not.toBeDisabled();
  });

  it('clicking Remove calls removeSticker with selected id', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().addSticker('star');
    const sticker = useCoverStore.getState().stickers[0];
    useCoverStore.getState().selectSticker(sticker.id);
    render(<StickerActions />);
    await user.click(screen.getByText('cover.customize.removeSticker'));
    expect(useCoverStore.getState().stickers).toHaveLength(0);
  });

  it('shows Clear All button when stickers exist', () => {
    useCoverStore.getState().addSticker('star');
    render(<StickerActions />);
    expect(screen.getByText('cover.customize.clearAllStickers')).toBeInTheDocument();
  });

  it('shows confirmation buttons after clicking Clear All', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().addSticker('star');
    render(<StickerActions />);
    await user.click(screen.getByText('cover.customize.clearAllStickers'));
    expect(screen.getByText('cover.customize.clearAllConfirm')).toBeInTheDocument();
    expect(screen.getByText('cover.customize.cancel')).toBeInTheDocument();
  });

  it('cancels clear and returns to normal view', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().addSticker('star');
    render(<StickerActions />);
    await user.click(screen.getByText('cover.customize.clearAllStickers'));
    await user.click(screen.getByText('cover.customize.cancel'));
    expect(screen.queryByText('cover.customize.clearAllConfirm')).not.toBeInTheDocument();
    expect(screen.getByText('cover.customize.clearAllStickers')).toBeInTheDocument();
  });

  it('clears all stickers after confirmation', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().addSticker('star');
    useCoverStore.getState().addSticker('heart');
    render(<StickerActions />);
    await user.click(screen.getByText('cover.customize.clearAllStickers'));
    await user.click(screen.getByText('cover.customize.clearAllConfirm'));
    expect(useCoverStore.getState().stickers).toHaveLength(0);
  });
});
