// Contopia — PublishSuccessToast Component Tests (STORY-020)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock react-router-dom useNavigate for the navigation test
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// setup.js already mocks i18next

import PublishSuccessToast from '../components/editor/PublishSuccessToast';

function renderToast(props) {
  return render(
    <BrowserRouter>
      <PublishSuccessToast {...props} />
    </BrowserRouter>
  );
}

describe('PublishSuccessToast', () => {
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Tests that DON'T use fake timers (basic rendering) ===

  it('renders when isOpen is true', () => {
    renderToast({ isOpen: true, onDismiss, bookId: 'book123' });
    expect(screen.getByText('highlightNew')).toBeInTheDocument();
    expect(screen.getByText('goToShelf')).toBeInTheDocument();
  });

  it('returns null when isOpen is false', () => {
    const { container } = renderToast({ isOpen: false, onDismiss, bookId: 'book123' });
    expect(container.innerHTML).toBe('');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    renderToast({ isOpen: true, onDismiss, bookId: 'book123' });
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup();
    renderToast({ isOpen: true, onDismiss, bookId: 'book123' });
    await user.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('navigates to shelf with highlight param when goToShelf clicked', async () => {
    const user = userEvent.setup();
    renderToast({ isOpen: true, onDismiss, bookId: 'book456' });
    const button = screen.getByText('goToShelf');
    await user.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/shelf?highlight=book456');
  });

  // === Tests with fake timers (auto-dismiss behavior) ===

  describe('auto-dismiss behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-dismisses after 4 seconds', () => {
      renderToast({ isOpen: true, onDismiss, bookId: 'book123' });
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(4000);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('clears timer on unmount', () => {
      const { unmount } = renderToast({ isOpen: true, onDismiss, bookId: 'book123' });
      unmount();
      vi.advanceTimersByTime(4000);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
