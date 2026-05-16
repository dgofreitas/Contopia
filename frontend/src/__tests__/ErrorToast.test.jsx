// Contopia — ErrorToast Component Tests (STORY-008)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorToast from '../components/common/ErrorToast';

describe('ErrorToast', () => {
  const onDismiss = vi.fn();
  const defaultToast = { id: 'toast-1', code: 'VALIDATION_ERROR', message: 'Test message' };

  beforeEach(() => {
    onDismiss.mockClear();
  });

  // ── Accessibility ──

  it('renders with role="alert"', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with aria-live="assertive"', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders with aria-atomic="true"', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-atomic', 'true');
  });

  // ── Message rendering ──

  it('displays the provided message', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('falls back to i18n translation when message is null', () => {
    render(<ErrorToast id="t-1" code="VALIDATION_ERROR" message={null} onDismiss={onDismiss} />);
    expect(screen.getByText('VALIDATION_ERROR')).toBeInTheDocument();
  });

  it('falls back to i18n translation when message is undefined', () => {
    render(<ErrorToast id="t-1" code="NOT_FOUND" onDismiss={onDismiss} />);
    expect(screen.getByText('NOT_FOUND')).toBeInTheDocument();
  });

  // ── Dismiss button ──

  it('renders dismiss button with GOT_IT label', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: 'GOT_IT' })).toBeInTheDocument();
  });

  it('calls onDismiss with toast id when dismiss button is clicked', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'GOT_IT' }));
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  // ── Styles by error code ──

  it('applies warning styles for RATE_LIMITED code', () => {
    render(<ErrorToast id="t-1" code="RATE_LIMITED" message="Slow down" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('amber');
  });

  it('applies warning styles for OFFLINE code', () => {
    render(<ErrorToast id="t-1" code="OFFLINE" message="Offline" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('amber');
  });

  it('applies warning styles for BACK_ONLINE code', () => {
    render(<ErrorToast id="t-1" code="BACK_ONLINE" message="Back online" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('amber');
  });

  it('applies error styles for VALIDATION_ERROR code', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('rose');
  });

  it('applies error styles for INTERNAL_ERROR code', () => {
    render(<ErrorToast id="t-1" code="INTERNAL_ERROR" message="Oops" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('rose');
  });

  it('applies error styles for an unknown code', () => {
    render(<ErrorToast id="t-1" code="UNKNOWN_CODE" message="Hmm" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert').className).toContain('rose');
  });

  // ── Icon rendering ──

  it('renders warning icon for warning codes', () => {
    render(<ErrorToast id="t-1" code="RATE_LIMITED" message="Slow" onDismiss={onDismiss} />);
    // Warning icon is ⚠️
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders error icon for error codes', () => {
    render(<ErrorToast id="t-1" code="VALIDATION_ERROR" message="Error" onDismiss={onDismiss} />);
    // Error icon is 🔴
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('renders error icon for unknown code', () => {
    render(<ErrorToast id="t-1" code="UNKNOWN" message="Hmm" onDismiss={onDismiss} />);
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('renders warning icon for OFFLINE', () => {
    render(<ErrorToast id="t-1" code="OFFLINE" message="Off" onDismiss={onDismiss} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders warning icon for BACK_ONLINE', () => {
    render(<ErrorToast id="t-1" code="BACK_ONLINE" message="Back" onDismiss={onDismiss} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  // ── Touch target ──

  it('dismiss button meets minimum touch target size', () => {
    render(<ErrorToast {...defaultToast} onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: 'GOT_IT' });
    expect(btn.className).toContain('min-h-[44px]');
    expect(btn.className).toContain('min-w-[44px]');
  });
});
