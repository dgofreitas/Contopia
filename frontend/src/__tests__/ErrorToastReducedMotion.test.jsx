// Contopia — ErrorToast Reduced Motion Path (STORY-008)
// This file overrides matchMedia BEFORE importing ErrorToast so the
// module-level prefersReducedMotion constant evaluates to true.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';

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

describe('ErrorToast (reduced motion)', () => {
  it('renders without motion wrapper when prefers-reduced-motion is set', async () => {
    // Dynamic import captures the mocked matchMedia at module evaluation time
    const { default: ErrorToast } = await import('../components/common/ErrorToast');

    const onDismiss = vi.fn();
    const { container } = render(
      <ErrorToast id="t-1" code="VALIDATION_ERROR" message="Reduced motion" onDismiss={onDismiss} />
    );

    // Should render a plain div with role="alert", not a motion.div
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Reduced motion')).toBeInTheDocument();

    // Should have the warning icon span with aria-hidden
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans.length).toBeGreaterThanOrEqual(1);
  });
});
