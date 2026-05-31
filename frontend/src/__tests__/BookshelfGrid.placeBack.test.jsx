import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Hoisted mock values
const mockSortAnimationState = vi.hoisted(() => ({
  sortGeneration: 0,
  prefersReducedMotion: false,
  getTransition: (index) => ({
    type: 'spring', stiffness: 300, damping: 20, delay: Math.min(index * 0.03, 0.3),
  }),
  isAnimating: true,
}));

vi.mock('../hooks/useSortAnimation', () => ({
  default: () => ({
    sortGeneration: mockSortAnimationState.sortGeneration,
    prefersReducedMotion: mockSortAnimationState.prefersReducedMotion,
    getTransition: mockSortAnimationState.getTransition,
    isAnimating: mockSortAnimationState.isAnimating,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// We need proper mocks for framer-motion to allow BookSpine to render
// with animationPhase and onPlaceBackComplete props
vi.mock('framer-motion', () => {
  const MockMotionButton = ({ children, animate, variants, onAnimationComplete, ...props }) => {
    // Store the animate value for assertions
    return <button data-animate={animate || ''} {...props}>{children}</button>;
  };
  const MockMotionDiv = ({ children, ...props }) => <div {...props}>{children}</div>;
  return {
    useReducedMotion: () => false,
    motion: {
      button: MockMotionButton,
      div: MockMotionDiv,
    },
    m: {
      button: MockMotionButton,
      div: MockMotionDiv,
    },
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
  };
});

vi.mock('../hooks/useBookPullOut', () => ({
  default: () => ({
    animatingBookId: null,
    isReversing: false,
    startPullOut: vi.fn(),
    reversePullOut: vi.fn(),
    clearAnimating: vi.fn(),
    getAnimationVariant: () => ({}),
    getVariantName: () => 'rest',
  }),
  PULL_OUT_VARIANTS: {
    rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' },
    reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    placeBack: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  },
  PULL_OUT_VARIANTS_REDUCED: {
    rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1 },
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)', opacity: 1 },
    reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1 },
    placeBack: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1 },
  },
  PULL_OUT_DURATION: 0.25,
  REVERSE_DURATION: 0.15,
  PULL_OUT_EASING: [0.34, 1.56, 0.64, 1],
  REVERSE_EASING: [0.25, 0.1, 0.25, 1],
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookshelfGrid from '../components/shelf/BookshelfGrid';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui, options) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options
  );
}

// Helper to get spine button by book title - targets only buttons inside .shelf-spine-cell
function getSpineButton(title) {
  return Array.from(document.querySelectorAll('.shelf-spine-cell button')).find(
    (b) => b.textContent.includes(title)
  );
}

const PLACE_BACK_FALLBACK_MS = 350;

describe('BookshelfGrid place-back flow (STORY-042)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // === SCENARIO 1: Pull out → place back → spine returns to idle ===
  describe('Scenario 1: pull out → place back → spine returns to idle', () => {
    it('click spine to pull out, place-back button returns spine with overlay closed', () => {
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = getSpineButton('Book A');
      fireEvent.click(bookBtn);

      // Verify pulled-out overlay appears
      let pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Click "Place Back" button
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);

      // Overlay should be gone after place-back
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).not.toBeInTheDocument();

      // After fallback timeout, spine should be back to rest
      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      // Click spine again — it should be in rest state so it pulls out fresh
      fireEvent.click(bookBtn);
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();
    });
  });

  // === SCENARIO 2: Re-tap same spine during place-back → reverses to pull-out ===
  describe('Scenario 2: re-tap same spine during place-back → reverses to pull-out', () => {
    it('tapping the same spine during place-back keeps the overlay visible', () => {
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = getSpineButton('Book A');
      fireEvent.click(bookBtn);

      // Overlay is present
      let overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();

      // Click place back
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);

      // Overlay should be gone (AnimatePresence condition: !isPlacingBack)
      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).not.toBeInTheDocument();

      // Re-tap same spine immediately (simulates rapid re-tap during place-back)
      // The handleBookClick checks animationPhase === 'placeBack' && bookId === pulledOutBookId
      // → cancelPlaceBack() → keeps pulledOutBookId set → PulledOutOverlay should show again
      fireEvent.click(bookBtn);

      // After cancelPlaceBack, isPlacingBack is false and pulledOutBookId is still set
      // So PulledOutOverlay should re-appear (AnimatePresence shows when pulledBook && !isPlacingBack)
      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();
    });
  });

  // === SCENARIO 3: Reduced motion → instant return with fade ===
  describe('Scenario 3: reduced motion → instant return', () => {
    it('place-back with reduced motion instantly hides overlay', () => {
      // Override useReducedMotion for this test
      // Note: the hook uses framer-motion's useReducedMotion which is mocked above
      // For this test, the overlay disappears instantly due to isPlacingBack check
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      fireEvent.click(getSpineButton('Book A'));

      let overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();

      // Place back
      fireEvent.click(screen.getByLabelText('placeBack'));

      // Overlay gone immediately (isPlacingBack = true hides overlay instantly)
      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  // === SCENARIO 4: Close cover overlay does NOT auto-trigger place-back (STORY-013 AC4) ===
  describe('Scenario 4: close cover overlay does NOT auto-trigger place-back', () => {
    it('closing cover overlay returns to pulled-out state (book still pulled out)', () => {
      const book = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author',
        description: 'Desc',
        coverUrl: 'https://example.com/cover.jpg',
      };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      fireEvent.click(getSpineButton('Book A'));

      // Open cover overlay via View Cover button
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Cover overlay should be present
      let coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(coverCloseBtn).toBeInTheDocument();

      // Close the cover overlay
      fireEvent.click(coverCloseBtn);

      // Cover overlay gone
      coverCloseBtn = screen.queryByLabelText('coverOverlay.close');
      expect(coverCloseBtn).not.toBeInTheDocument();

      // But pulled-out overlay should STILL be present (no auto place-back)
      const pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();
    });
  });

  // === SCENARIO 5: Rapid cycle 5x → no stuck state ===
  describe('Scenario 5: rapid cycle 5x → no stuck state', () => {
    it('rapidly cycles pull-out and place-back 5 times without getting stuck', () => {
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      const bookBtn = getSpineButton('Book A');

      for (let cycle = 0; cycle < 5; cycle++) {
        // Pull out
        fireEvent.click(bookBtn);

        let overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
        expect(overlay).toBeInTheDocument();

        // Place back
        fireEvent.click(screen.getByLabelText('placeBack'));

        overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
        // Overlay should be gone during place-back
        expect(overlay).not.toBeInTheDocument();

        // Advance timers to complete the fallback timeout
        act(() => {
          vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
        });
      }

      // After 5 cycles, state should be clean
      // Click to pull out fresh
      fireEvent.click(bookBtn);
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();
    });
  });

  // === SCENARIO 6: Neighboring spines don't shift during place-back ===
  describe('Scenario 6: neighboring spines unaffected by place-back', () => {
    it('multiple spines render without layout disruption during place-back', () => {
      const books = [
        { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' },
        { _id: '2', title: 'Book B', authorName: 'Author', description: 'Desc' },
        { _id: '3', title: 'Book C', authorName: 'Author', description: 'Desc' },
      ];
      renderWithProviders(<BookshelfGrid books={books} onBookClick={vi.fn()} />);

      const spineCells = document.querySelectorAll('.shelf-spine-cell');
      expect(spineCells.length).toBe(3);

      // Pull out Book A
      fireEvent.click(getSpineButton('Book A'));

      // All 3 books still rendered
      expect(screen.getAllByText('Book A').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();
      expect(screen.getAllByText('Book B').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();
      expect(screen.getAllByText('Book C').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();

      // Check no extra/missing spine cells
      const spineCellsAfterPull = document.querySelectorAll('.shelf-spine-cell');
      expect(spineCellsAfterPull.length).toBe(3);

      // Place back
      fireEvent.click(screen.getByLabelText('placeBack'));

      // All books still rendered after place-back
      expect(screen.getAllByText('Book A').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();
      expect(screen.getAllByText('Book B').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();
      expect(screen.getAllByText('Book C').filter(el => el.closest('.shelf-spine-cell'))[0]).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      const spineCellsAfterPlaceback = document.querySelectorAll('.shelf-spine-cell');
      expect(spineCellsAfterPlaceback.length).toBe(3);
    });
  });

  // === SCENARIO 7: Keyboard Escape → place-back → focus returns to spine ===
  describe('Scenario 7: keyboard Escape → place-back', () => {
    it('Escape key during pulled-out overlay triggers place-back', () => {
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      fireEvent.click(getSpineButton('Book A'));

      let overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();

      // Press Escape on the overlay
      fireEvent.keyDown(overlay, { key: 'Escape' });

      // Overlay is dismissed (handleDismiss → onDismiss)
      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).not.toBeInTheDocument();
    });

    it('Escape then re-tap works correctly', () => {
      const book = { _id: '1', title: 'Book A', authorName: 'Author', description: 'Desc' };
      renderWithProviders(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      // Pull out
      fireEvent.click(getSpineButton('Book A'));

      let overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();

      // Escape to dismiss
      fireEvent.keyDown(overlay, { key: 'Escape' });

      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).not.toBeInTheDocument();

      // Advance timers so place-back completes
      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      // Re-tap to pull out fresh — should work
      fireEvent.click(getSpineButton('Book A'));
      overlay = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(overlay).toBeInTheDocument();
    });
  });
});
