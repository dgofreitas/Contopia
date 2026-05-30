// Contopia — SortMenu Component Tests (STORY-035)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SortMenu from '../components/shelf/SortMenu';

// setup.js already mocks react-i18next globally

describe('SortMenu', () => {
  beforeEach(() => {
    // Ensure no leftover DOM from previous tests
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  // --- Basic render ---

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders three sort options when isOpen is true', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('sort.alphabetical')).toBeInTheDocument();
    expect(screen.getByText('sort.favorites')).toBeInTheDocument();
    expect(screen.getByText('sort.recentlyRead')).toBeInTheDocument();
  });

  it('has role="menu" with aria-label', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('aria-label', 'sort.menuLabel');
  });

  // --- ARIA attributes ---

  it('marks each option as menuitemradio with aria-checked', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
    expect(options[1]).toHaveAttribute('aria-checked', 'false');
    expect(options[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('has meaningful aria-label on each option', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options[0]).toHaveAttribute('aria-label', 'sort.optionAria');
    expect(options[1]).toHaveAttribute('aria-label', 'sort.optionAria');
    expect(options[2]).toHaveAttribute('aria-label', 'sort.optionAria');
  });

  // --- Active state ---

  it('highlights the active sort option with amber styling', () => {
    render(
      <SortMenu currentSort="recently-read" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options[2]).toHaveClass('bg-amber-50');
    expect(options[2]).toHaveClass('text-amber-700');
    expect(options[2]).toHaveClass('font-semibold');
  });

  it('does not highlight non-active options', () => {
    render(
      <SortMenu currentSort="recently-read" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options[0]).not.toHaveClass('bg-amber-50');
    expect(options[1]).not.toHaveClass('bg-amber-50');
  });

  // --- Favorites option (STORY-036) ---

  it('favorites option is enabled', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options[1]).not.toBeDisabled();
  });

  it('favorites option shows correct label', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('sort.favorites')).toBeInTheDocument();
  });

  it('clicking favorites option calls onSortChange with "favorites"', () => {
    const onSortChange = vi.fn();
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={onSortChange} isOpen={true} onClose={onClose} />
    );
    const options = screen.getAllByRole('menuitemradio');
    fireEvent.click(options[1]);
    expect(onSortChange).toHaveBeenCalledWith('favorites');
    expect(onClose).toHaveBeenCalled();
  });

  // --- Click to select sort ---

  it('calls onSortChange and onClose when clicking an enabled option', () => {
    const onSortChange = vi.fn();
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={onSortChange} isOpen={true} onClose={onClose} />
    );
    const options = screen.getAllByRole('menuitemradio');
    // Click "recently-read" (index 2, enabled)
    fireEvent.click(options[2]);
    expect(onSortChange).toHaveBeenCalledWith('recently-read');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSortChange with the correct mode', () => {
    const onSortChange = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={onSortChange} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    fireEvent.click(options[0]); // alphabetical
    expect(onSortChange).toHaveBeenCalledWith('alphabetical');
  });

  // --- Click outside to close ---

  it('calls onClose when clicking outside the menu', () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside" />
        <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={onClose} />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call onClose when clicking inside the menu', () => {
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={onClose} />
    );
    const menu = screen.getByRole('menu');
    fireEvent.mouseDown(menu);
    expect(onClose).not.toHaveBeenCalled();
  });

  // --- Escape key closes ---

  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call onClose when pressing other keys (not Escape)', () => {
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // --- Keyboard navigation ---

  it('focuses the first option when menu opens', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(document.activeElement).toBe(options[0]);
  });

  it('ArrowDown moves focus to next option', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    options[0].focus();
    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);
  });

  it('ArrowUp moves focus to previous option', () => {
    render(
      <SortMenu currentSort="recently-read" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    options[2].focus();
    fireEvent.keyDown(options[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[1]);
  });

  it('ArrowDown wraps around to first option', () => {
    render(
      <SortMenu currentSort="recently-read" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    options[2].focus();
    fireEvent.keyDown(options[2], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('ArrowUp wraps around to last option', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    options[0].focus();
    fireEvent.keyDown(options[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[2]);
  });

  it('Tab key closes the menu', () => {
    const onClose = vi.fn();
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={onClose} />
    );
    const options = screen.getAllByRole('menuitemradio');
    fireEvent.keyDown(options[0], { key: 'Tab' });
    expect(onClose).toHaveBeenCalled();
  });

  // --- Touch targets ---

  it('all option buttons have minimum touch target of 48px', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    options.forEach((btn) => {
      expect(btn).toHaveClass('min-h-[48px]');
      expect(btn).toHaveClass('min-w-[48px]');
    });
  });

  // --- data attributes ---

  it('each option has data-sort-mode attribute', () => {
    render(
      <SortMenu currentSort="alphabetical" onSortChange={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    const options = screen.getAllByRole('menuitemradio');
    expect(options[0]).toHaveAttribute('data-sort-mode', 'alphabetical');
    expect(options[1]).toHaveAttribute('data-sort-mode', 'favorites');
    expect(options[2]).toHaveAttribute('data-sort-mode', 'recently-read');
  });
});
