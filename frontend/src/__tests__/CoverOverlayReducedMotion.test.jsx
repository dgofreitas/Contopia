// Contopia — CoverOverlay Reduced Motion Tests (STORY-012)
// This file overrides matchMedia BEFORE importing CoverOverlay so the
// module-level prefersReducedMotion constant evaluates to true.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const origMatchMedia = window.matchMedia;

beforeAll(() => {
  // Set matchMedia to return true for prefers-reduced-motion: reduce
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterAll(() => {
  window.matchMedia = origMatchMedia;
});

describe('CoverOverlay (reduced motion)', () => {
  const baseBook = {
    _id: 'book-123',
    title: 'My Little Pony',
    authorName: 'Jane Author',
    description: 'This is a wonderful story.',
    spineColor: '#4ECDC4',
    coverUrl: 'https://example.com/covers/book-123.jpg',
  };

  it('renders correctly with reduced motion', async () => {
    // Dynamic import captures the mocked matchMedia at module evaluation time
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />
    );

    // Should render the dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('coverOverlay.title')).toBeInTheDocument();
  });

  it('has correct a11y attributes when reduced motion is enabled', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label');
  });

  it('overlay still functions correctly (close button works)', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');
    const onClose = vi.fn();

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={onClose}
        onRead={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText('coverOverlay.close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('overlay still functions correctly (read button works)', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');
    const onRead = vi.fn();

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onRead={onRead}
      />
    );

    const readBtn = screen.getByLabelText('coverOverlay.readBook');
    fireEvent.click(readBtn);
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('overlay still functions correctly (backdrop click closes)', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');
    const onClose = vi.fn();

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={onClose}
        onRead={vi.fn()}
      />
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('overlay still functions correctly (escape key closes)', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');
    const onClose = vi.fn();

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={onClose}
        onRead={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focus trap still works with reduced motion', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');

    render(
      <CoverOverlay
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[1]; // Close button

    // Focus the last button
    lastButton.focus();

    // Press Tab (should wrap to first element)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });

    const firstButton = buttons[0]; // Read button
    expect(firstButton).toHaveFocus();
  });

  it('does not render when isOpen=false', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');

    const { container } = render(
      <CoverOverlay
        isOpen={false}
        book={baseBook}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders with DefaultCover when coverUrl is null', async () => {
    const { default: CoverOverlay } = await import('../components/shelf/CoverOverlay');
    const bookWithoutCover = { ...baseBook, coverUrl: null };

    render(
      <CoverOverlay
        isOpen={true}
        book={bookWithoutCover}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />
    );

    // Should still render the overlay
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Title should appear twice (once in DefaultCover, once in overlay)
    const titles = screen.getAllByText('My Little Pony');
    expect(titles).toHaveLength(2);
  });
});
