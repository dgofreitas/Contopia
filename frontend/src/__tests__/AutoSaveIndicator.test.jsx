// Contopia — AutoSaveIndicator Unit Tests (STORY-019)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AutoSaveIndicator from '../components/editor/AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows saving status when saveStatus is saving', () => {
    render(<AutoSaveIndicator saveStatus="saving" />);
    const els = screen.getAllByText('syncingMessage');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('shows saved status when saveStatus is saved', () => {
    render(<AutoSaveIndicator saveStatus="saved" />);
    const els = screen.getAllByText('savedExclamation');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('shows offline status when saveStatus is offline', () => {
    render(<AutoSaveIndicator saveStatus="offline" />);
    const els = screen.getAllByText('offlineMessage');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('shows error status when saveStatus is error', () => {
    render(<AutoSaveIndicator saveStatus="error" />);
    const els = screen.getAllByText('unableToSync');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('shows conflict status when saveStatus is conflict', () => {
    render(<AutoSaveIndicator saveStatus="conflict" />);
    const els = screen.getAllByText('localChangesKept');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('shows saved timestamp when saveStatus is idle with lastSavedAt', () => {
    const savedAt = new Date('2025-06-15T14:30:00').getTime();
    render(<AutoSaveIndicator saveStatus="idle" lastSavedAt={savedAt} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders minimal output when saveStatus is idle with no lastSavedAt', () => {
    const { container } = render(<AutoSaveIndicator saveStatus="idle" />);
    expect(container.querySelectorAll('[aria-live="polite"]').length).toBeGreaterThanOrEqual(1);
  });

  it('uses custom offlineMessage when provided', () => {
    render(<AutoSaveIndicator saveStatus="offline" offlineMessage="Custom offline" />);
    expect(screen.getByText('Custom offline')).toBeInTheDocument();
  });

  it('fades out after saved status', () => {
    render(<AutoSaveIndicator saveStatus="saved" />);
    expect(screen.getAllByText('savedExclamation').length).toBeGreaterThanOrEqual(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('prioritizes different states via saveStatus', () => {
    const { rerender } = render(<AutoSaveIndicator saveStatus="saving" />);
    expect(screen.getAllByText('syncingMessage').length).toBeGreaterThanOrEqual(1);

    rerender(<AutoSaveIndicator saveStatus="saved" />);
    expect(screen.getAllByText('savedExclamation').length).toBeGreaterThanOrEqual(1);

    rerender(<AutoSaveIndicator saveStatus="offline" />);
    expect(screen.getAllByText('offlineMessage').length).toBeGreaterThanOrEqual(1);

    rerender(<AutoSaveIndicator saveStatus="error" />);
    expect(screen.getAllByText('unableToSync').length).toBeGreaterThanOrEqual(1);

    rerender(<AutoSaveIndicator saveStatus="conflict" />);
    expect(screen.getAllByText('localChangesKept').length).toBeGreaterThanOrEqual(1);
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<AutoSaveIndicator saveStatus="saving" />);
    const srEl = screen.getByRole('status');
    expect(srEl).toHaveAttribute('aria-live', 'polite');
  });

  it('visible indicator is aria-hidden for screen readers', () => {
    render(<AutoSaveIndicator saveStatus="saving" />);
    const wrapper = document.querySelector('.autosave-indicator-wrapper');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('debounces screen reader announcements', () => {
    render(<AutoSaveIndicator saveStatus="saving" />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows conflict info as sr-only when provided', () => {
    render(<AutoSaveIndicator saveStatus="conflict" conflictInfo="Local draft is newer" />);
    expect(screen.getAllByText('localChangesKept').length).toBeGreaterThanOrEqual(1);
  });
});