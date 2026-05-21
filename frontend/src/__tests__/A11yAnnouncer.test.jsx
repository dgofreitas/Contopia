// Contopia — A11yAnnouncer Component Tests (STORY-021)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import A11yAnnouncer from '../components/common/A11yAnnouncer';

describe('A11yAnnouncer', () => {
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

  it('uses sr-only class to visually hide', () => {
    render(<A11yAnnouncer message="Test message" />);

    const span = screen.getByText('Test message');
    expect(span.className).toContain('sr-only');
  });

  it('renders empty message gracefully', () => {
    const { container } = render(<A11yAnnouncer message="" />);

    const span = container.querySelector('[aria-live="polite"]');
    expect(span).toBeInTheDocument();
    expect(span.textContent).toBe('');
  });
});
