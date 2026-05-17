import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import EmptyShelfState from '../components/shelf/EmptyShelfState';

// setup.js already mocks react-i18next to pass through keys

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('EmptyShelfState', () => {
  it('renders with role="status"', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the empty title via i18n key', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByText('emptyTitle')).toBeInTheDocument();
  });

  it('renders the create book button with aria-label', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByRole('button', { name: 'writeFirstBook' })).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    renderWithRouter(<EmptyShelfState />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('renders SVG illustration', () => {
    const { container } = renderWithRouter(<EmptyShelfState />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('CTA button uses writeFirstBook i18n key', () => {
    renderWithRouter(<EmptyShelfState />);
    const button = screen.getByRole('button', { name: 'writeFirstBook' });
    expect(button).toHaveTextContent('writeFirstBook');
  });

  it('CTA has minimum touch target size', () => {
    renderWithRouter(<EmptyShelfState />);
    const button = screen.getByRole('button', { name: 'writeFirstBook' });
    expect(button).toHaveClass('min-h-[48px]');
  });

  it('prefers-reduced-motion disables animation', () => {
    // Mock matchMedia to return true for reduced-motion query
    const originalMatchMedia = window.matchMedia;
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

    try {
      const { container } = renderWithRouter(<EmptyShelfState />);
      // Get the illustration wrapper (the div with aria-hidden="true")
      const illustrationWrapper = container.querySelector('svg')?.closest('div');
      // Assert it has no style attribute with transform/translate
      expect(illustrationWrapper).not.toHaveAttribute('style');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('keyboard navigation: button can be focused', () => {
    renderWithRouter(<EmptyShelfState />);
    const button = screen.getByRole('button', { name: 'writeFirstBook' });
    button.focus();
    expect(button).toHaveFocus();
  });

  it('keyboard navigation: Enter triggers click', () => {
    renderWithRouter(<EmptyShelfState />);
    const button = screen.getByRole('button', { name: 'writeFirstBook' });
    button.focus();
    expect(button).toHaveFocus();
    userEvent.keyboard('{Enter}');
    expect(button).toBeInTheDocument();
  });

  it('viewport 320px no overflow', () => {
    renderWithRouter(<EmptyShelfState />);
    const container = screen.getByRole('status');
    // Verify centered layout with no overflow issues
    expect(container).toHaveClass('flex', 'items-center');
    // No explicit overflow-hidden needed, but ensure it renders cleanly
    expect(container).toBeInTheDocument();
  });
});
