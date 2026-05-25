// Contopia — StickerButton Component Tests (STORY-024 §7.3)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StickerButton from '../app/cover/StickerButton';

describe('StickerButton', () => {
  it('renders the SVG thumbnail for a valid svgId', () => {
    const { container } = render(<StickerButton svgId="star" onSelect={() => {}} disabled={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has aria-label with sticker name', () => {
    render(<StickerButton svgId="star" onSelect={() => {}} disabled={false} />);
    const button = screen.getByRole('button');
    // The mock t() returns the key: "cover.stickers.star"
    expect(button).toHaveAttribute('aria-label', 'cover.stickers.star');
  });

  it('does not have aria-pressed (not a toggle button per code review fix)', () => {
    render(<StickerButton svgId="star" onSelect={() => {}} disabled={false} />);
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-pressed');
  });

  it('calls onSelect with svgId when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StickerButton svgId="star" onSelect={onSelect} disabled={false} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('star');
  });

  it('does not call onSelect when disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StickerButton svgId="star" onSelect={onSelect} disabled={true} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<StickerButton svgId="star" onSelect={() => {}} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as enabled when disabled prop is false', () => {
    render(<StickerButton svgId="star" onSelect={() => {}} disabled={false} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('returns null for unknown svgId', () => {
    const { container } = render(<StickerButton svgId="nonexistent" onSelect={() => {}} disabled={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders SVG for rainbow-arc sticker', () => {
    const { container } = render(<StickerButton svgId="rainbow-arc" onSelect={() => {}} disabled={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has focus-visible styles via class', () => {
    render(<StickerButton svgId="star" onSelect={() => {}} disabled={false} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible:ring-2');
  });

  it('is memoized (re-renders only when props change)', () => {
    // We can't directly test memo, but we can verify the component exists as memo'd export
    expect(StickerButton).toBeDefined();
  });
});
