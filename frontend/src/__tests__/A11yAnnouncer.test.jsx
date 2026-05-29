// Contopia — A11yAnnouncer Component Tests (STORY-021, STORY-032)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import A11yAnnouncer from '../components/common/A11yAnnouncer';

describe('A11yAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message text', () => {
    render(<A11yAnnouncer message="Editing your book: My Story" />);

    expect(screen.getByText('Editing your book: My Story')).toBeInTheDocument();
  });

  it('has aria-live="polite" for screen readers', () => {
    render(<A11yAnnouncer message="Test message" />);

    const span = screen.getByText('Test message');
    expect(span).toHaveAttribute('aria-live', 'polite');
  });

  it('has role="status" for accessibility', () => {
    render(<A11yAnnouncer message="Test message" />);

    const span = screen.getByText('Test message');
    expect(span).toHaveAttribute('role', 'status');
  });

  it('has aria-atomic="true" for complete announcements', () => {
    render(<A11yAnnouncer message="Test message" />);

    const span = screen.getByText('Test message');
    expect(span).toHaveAttribute('aria-atomic', 'true');
  });

  it('uses sr-only class to visually hide', () => {
    render(<A11yAnnouncer message="Test message" />);

    const span = screen.getByText('Test message');
    expect(span.className).toContain('sr-only');
  });

  it('renders empty message gracefully', () => {
    const { container } = render(<A11yAnnouncer message="" />);

    const span = container.querySelector('[aria-live="polite"]');
    expect(span).toBeInTheDocument();
  });

  it('queues messages and announces them sequentially', () => {
    const { rerender } = render(<A11yAnnouncer message="First" />);

    expect(screen.getByText('First')).toBeInTheDocument();

    // Send second message while first is displayed
    rerender(<A11yAnnouncer message="Second" />);

    // Advance timer to process queue
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Second message should eventually be displayed
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('clears displayed message after announcement timeout', () => {
    const { container } = render(<A11yAnnouncer message="Announcement" />);

    expect(screen.getByText('Announcement')).toBeInTheDocument();

    // Advance timer past the clear timeout
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Message should be cleared (empty string rendered)
    const span = container.querySelector('[aria-live="polite"]');
    expect(span.textContent).toBe('');
  });
});
