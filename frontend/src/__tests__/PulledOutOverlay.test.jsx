// Contopia — PulledOutOverlay Component Tests (STORY-011)
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PulledOutOverlay from '../components/shelf/PulledOutOverlay';

// setup.js already mocks react-i18next to pass through keys

const baseBook = {
  _id: 'book-123',
  title: 'My Little Pony',
  summary: 'This is a longer summary that should be truncated at 120 characters to fit within the card design.',
};

describe('PulledOutOverlay', () => {
  let triggerRef;

  beforeEach(() => {
    triggerRef = { current: { focus: vi.fn() } };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders book details when book is provided', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('renders nothing when book is null', () => {
      const { container } = render(
        <PulledOutOverlay
          book={null}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('has role="dialog" on the overlay', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has aria-label on dialog via i18n', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'pullOut.ariaActions');
    });

    it('renders backdrop div', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(backdrop).toBeInTheDocument();
    });

    it('backdrop has aria-hidden="true"', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('backdrop click dismisses overlay', () => {
      const onDismiss = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      fireEvent.click(backdrop);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('focus moves to overlay on mount', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      // The dismiss button should be focused (via firstBtnRef)
      const dismissBtn = screen.getByLabelText('pullOut.ariaDismiss');
      expect(dismissBtn).toHaveFocus();
    });

    it('focus returns to trigger after dismiss triggers exit', async () => {
      const onDismiss = vi.fn();
      const { rerender } = render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      await act(async () => {
        fireEvent.click(backdrop);
      });

      expect(onDismiss).toHaveBeenCalled();

      await act(async () => {
        rerender(
          <PulledOutOverlay
            book={null}
            onDismiss={onDismiss}
            onRead={vi.fn()}
            onEdit={vi.fn()}
            onDesignCover={vi.fn()}
            onViewCover={vi.fn()}
            onPlaceBack={vi.fn()}
            triggerRef={triggerRef}
          />
        );
      });

      expect(triggerRef.current.focus).toHaveBeenCalled();
    });

    it('handles missing triggerRef gracefully', () => {
      const onDismiss = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={null}
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      fireEvent.click(backdrop);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation', () => {
    it('Escape key dismisses overlay', () => {
      const onDismiss = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('Tab wraps within overlay (forward)', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button');
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the last element
      lastElement.focus();

      // Press Tab (should wrap to first element)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });

      const firstElement = focusableElements[0];
      expect(firstElement).toHaveFocus();
    });

    it('Tab wraps within overlay (backward)', async () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button');
      const firstElement = focusableElements[0];

      // Focus the first element
      firstElement.focus();

      // Press Shift+Tab (should wrap to last element)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

      const lastElement = focusableElements[focusableElements.length - 1];
      expect(lastElement).toHaveFocus();
    });

    it('non-Tab keys pass through normally', () => {
      const onDismiss = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('action buttons', () => {
    it('Read button callback fires', () => {
      const onRead = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={onRead}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const readBtn = screen.getByLabelText('pullOut.read');
      fireEvent.click(readBtn);
      expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('Edit button callback fires', () => {
      const onEdit = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={onEdit}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const editBtn = screen.getByLabelText('pullOut.edit');
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('Design Cover button callback fires', () => {
      const onDesignCover = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={onDesignCover}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const designBtn = screen.getByLabelText('pullOut.designCover');
      fireEvent.click(designBtn);
      expect(onDesignCover).toHaveBeenCalledTimes(1);
    });

    it('Dismiss button callback fires', () => {
      const onDismiss = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const dismissBtn = screen.getByLabelText('pullOut.ariaDismiss');
      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('a11y features', () => {
    it('dismiss button is screen reader only until focused', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const dismissBtn = screen.getByLabelText('pullOut.ariaDismiss');
      expect(dismissBtn).toHaveClass('sr-only');
    });

    it('dismiss button becomes visible when focused', () => {
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );
      const dismissBtn = screen.getByLabelText('pullOut.ariaDismiss');
      dismissBtn.focus();
      expect(dismissBtn).toHaveClass('focus:not-sr-only');
    });
  });

  describe('STORY-013: place-back integration', () => {
    it('"Place Back" button in card fires onPlaceBack callback', () => {
      const onPlaceBack = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={onPlaceBack}
          triggerRef={triggerRef}
        />
      );
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);
      expect(onPlaceBack).toHaveBeenCalledTimes(1);
    });

    it('focus returns to trigger after backdrop click (dismiss)', async () => {
      const onDismiss = vi.fn();
      const { rerender } = render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={onDismiss}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      await act(async () => {
        fireEvent.click(backdrop);
      });

      expect(onDismiss).toHaveBeenCalled();

      await act(async () => {
        rerender(
          <PulledOutOverlay
            book={null}
            onDismiss={onDismiss}
            onRead={vi.fn()}
            onEdit={vi.fn()}
            onDesignCover={vi.fn()}
            onViewCover={vi.fn()}
            onPlaceBack={vi.fn()}
            triggerRef={triggerRef}
          />
        );
      });

      expect(triggerRef.current.focus).toHaveBeenCalled();
    });

    it('focus returns to trigger when "Place Back" button is clicked', async () => {
      const onPlaceBack = vi.fn();
      const { rerender } = render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={vi.fn()}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={onPlaceBack}
          triggerRef={triggerRef}
        />
      );

      const placeBackBtn = screen.getByLabelText('placeBack');
      await act(async () => {
        fireEvent.click(placeBackBtn);
      });

      expect(onPlaceBack).toHaveBeenCalled();

      await act(async () => {
        rerender(
          <PulledOutOverlay
            book={null}
            onDismiss={vi.fn()}
            onRead={vi.fn()}
            onEdit={vi.fn()}
            onDesignCover={vi.fn()}
            onViewCover={vi.fn()}
            onPlaceBack={onPlaceBack}
            triggerRef={triggerRef}
          />
        );
      });

      // Focus returns because handlePlaceBackFromCard sets dismissedRef = true
      expect(triggerRef.current.focus).toHaveBeenCalled();
    });

    it('focus does NOT return to trigger if not dismissed', async () => {
      const onRead = vi.fn();
      render(
        <PulledOutOverlay
          book={baseBook}
          onDismiss={vi.fn()}
          onRead={onRead}
          onEdit={vi.fn()}
          onDesignCover={vi.fn()}
          onViewCover={vi.fn()}
          onPlaceBack={vi.fn()}
          triggerRef={triggerRef}
        />
      );

      const readBtn = screen.getByLabelText('pullOut.read');
      fireEvent.click(readBtn);
      expect(onRead).toHaveBeenCalledTimes(1);

      // Focus should NOT return to trigger when not dismissed
      expect(triggerRef.current.focus).not.toHaveBeenCalled();
    });
  });
});
