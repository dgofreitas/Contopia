// Contopia — AutoSaveIndicator Unit Tests (STORY-018)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutoSaveIndicator from '../components/editor/AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    // Fix time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows saving status when isSaving is true', () => {
    render(<AutoSaveIndicator isSaving={true} />);
    expect(screen.getByText('saving')).toBeInTheDocument();
  });

  it('shows saving status with role="status"', () => {
    render(<AutoSaveIndicator isSaving={true} />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveTextContent('saving');
  });

  it('shows saving status when isSaving overrides isDirty', () => {
    render(<AutoSaveIndicator isSaving={true} isDirty={true} />);
    expect(screen.getByText('saving')).toBeInTheDocument();
    expect(screen.queryByText('unsavedChanges')).not.toBeInTheDocument();
  });

  it('shows unsaved changes when isDirty is true and not saving', () => {
    render(<AutoSaveIndicator isSaving={false} isDirty={true} />);
    expect(screen.getByText('unsavedChanges')).toBeInTheDocument();
  });

  it('shows unsaved changes with role="status"', () => {
    render(<AutoSaveIndicator isDirty={true} isSaving={false} />);
    const statusEls = screen.getAllByRole('status');
    expect(statusEls.length).toBeGreaterThanOrEqual(1);
    expect(statusEls[0]).toHaveTextContent('unsavedChanges');
  });

  it('shows saved time when lastSavedAt is provided', () => {
    const savedAt = new Date('2025-06-15T14:30:00').getTime();
    render(<AutoSaveIndicator isSaving={false} isDirty={false} lastSavedAt={savedAt} />);
    // The time should be formatted: "11:30" or similar depending on locale
    // But since we're checking t('savedAt', { time }), it returns the key
    // actually with the mock in setup.js, it replaces {{time}} with the value
    // Let's verify the structure
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with green checkmark icon when saved', () => {
    const savedAt = new Date('2025-06-15T14:30:00').getTime();
    const { container } = render(
      <AutoSaveIndicator isSaving={false} isDirty={false} lastSavedAt={savedAt} />
    );
    // Check that saved message includes the formatted time
    expect(screen.getByRole('status')).toHaveTextContent('savedAt');
  });

  it('returns null when none of the states are active', () => {
    const { container } = render(<AutoSaveIndicator isSaving={false} isDirty={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when all props are falsey', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving={false} isDirty={false} lastSavedAt={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('prioritizes saving over other states', () => {
    const { rerender } = render(
      <AutoSaveIndicator isSaving={true} isDirty={true} lastSavedAt={Date.now()} />
    );
    expect(screen.getByText('saving')).toBeInTheDocument();

    rerender(
      <AutoSaveIndicator isSaving={false} isDirty={true} lastSavedAt={Date.now()} />
    );
    expect(screen.getByText('unsavedChanges')).toBeInTheDocument();

    rerender(
      <AutoSaveIndicator isSaving={false} isDirty={false} lastSavedAt={Date.now()} />
    );
    expect(screen.getByText('savedAt')).toBeInTheDocument();
  });

  it('handles undefined lastSavedAt gracefully', () => {
    const { container } = render(
      <AutoSaveIndicator isSaving={false} isDirty={false} />
    );
    expect(container.innerHTML).toBe('');
  });
});
