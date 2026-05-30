// Contopia — SortButton Component Tests (STORY-035)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SortButton from '../components/shelf/SortButton';
import useBookStore from '../stores/book-store';

// setup.js already mocks react-i18next globally

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe('SortButton', () => {
  beforeEach(() => {
    localStorage.clear();
    useBookStore.getState().clearAll();
    // Reset sortMode after clearAll (clearAll does NOT reset sortMode)
    useBookStore.getState().setSortMode('recently-read');
  });

  it('renders a button with sort.buttonLabel aria-label', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'sort.buttonLabel');
  });

  it('has aria-expanded set to false initially', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-haspopup set to true', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-haspopup', 'true');
  });

  it('has minimum touch target of 48px', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('min-h-[48px]');
    expect(btn).toHaveClass('min-w-[48px]');
  });

  it('toggles SortMenu open on click', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    // SortMenu should not be visible initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(btn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click again to close
    fireEvent.click(btn);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows aria-expanded=true when menu is open', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('selecting a sort option closes the menu', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');

    // Open menu
    fireEvent.click(btn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click an option
    const options = screen.getAllByRole('menuitemradio');
    fireEvent.click(options[0]); // alphabetical

    // Menu should close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('selecting a sort option updates the sort mode', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');

    // Initial default is 'recently-read'
    expect(useBookStore.getState().sortMode).toBe('recently-read');

    // Open and select alphabetical
    fireEvent.click(btn);
    const options = screen.getAllByRole('menuitemradio');
    fireEvent.click(options[0]); // alphabetical

    expect(useBookStore.getState().sortMode).toBe('alphabetical');
  });

  it('reflects current sort mode icon (changes after selection)', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');

    // Open and select alphabetical
    fireEvent.click(btn);
    fireEvent.click(screen.getAllByRole('menuitemradio')[0]);

    // Re-open to check that "alphabetical" is now marked active
    fireEvent.click(btn);
    const options = screen.getAllByRole('menuitemradio');
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking outside the menu closes it via SortMenu', () => {
    render(
      <div>
        <div data-testid="outside" />
        <SortButton />
      </div>
    );

    // Open menu
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('pressing Escape closes the menu via SortMenu', () => {
    render(<SortButton />);

    // Open menu
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has amber styling classes', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-amber-500');
    expect(btn).toHaveClass('hover:bg-amber-600');
    expect(btn).toHaveClass('text-white');
  });

  it('re-tap closes menu without selecting a new sort option (sort mode unchanged)', () => {
    render(<SortButton />);
    const btn = screen.getByRole('button');
    const originalMode = useBookStore.getState().sortMode;

    // Open menu
    fireEvent.click(btn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close by clicking button again (no sort option selected in this interaction)
    fireEvent.click(btn);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // Sort mode unchanged
    expect(useBookStore.getState().sortMode).toBe(originalMode);
  });
});
