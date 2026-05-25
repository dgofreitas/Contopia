// Contopia — UploadProgress Component Tests (STORY-027)
// Tests: aria-live announcements at milestones, progressbar role, cancel, success/error states
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UploadProgress from '../app/cover/UploadProgress';

describe('UploadProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render progressbar role with correct aria attributes', () => {
    render(<UploadProgress progress={50} onCancel={vi.fn()} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-label', 'cover.upload.buttonLabel');
  });

  it('should display the current percentage', () => {
    render(<UploadProgress progress={75} onCancel={vi.fn()} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should show progress bar width proportional to progress', () => {
    const { container } = render(<UploadProgress progress={42} onCancel={vi.fn()} />);
    const barFill = container.querySelector('.h-full');
    expect(barFill).toHaveStyle({ width: '42%' });
  });

  it('should have aria-live region for announcements', () => {
    render(<UploadProgress progress={50} onCancel={vi.fn()} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('should announce at 25% on transition from 0', () => {
    const { rerender } = render(<UploadProgress progress={0} onCancel={vi.fn()} />);
    rerender(<UploadProgress progress={25} onCancel={vi.fn()} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion.textContent).toContain('cover.upload.progressAnnouncement');
  });

  it('should announce at 75% milestone', () => {
    const { rerender } = render(<UploadProgress progress={0} onCancel={vi.fn()} />);
    rerender(<UploadProgress progress={75} onCancel={vi.fn()} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion.textContent).toContain('cover.upload.progressAnnouncement');
  });

  it('should not re-announce already passed milestones', () => {
    const { rerender } = render(<UploadProgress progress={50} onCancel={vi.fn()} />);
    const initialContent = document.querySelector('[aria-live="polite"]').textContent;

    rerender(<UploadProgress progress={55} onCancel={vi.fn()} />);
    // No new milestone passed (50 was already announced), content should not change
    // Since we go from 50 to 55, no new milestone is crossed
    // The effect won't set a new announcement
    const newContent = document.querySelector('[aria-live="polite"]').textContent;
    expect(newContent).toBe(initialContent);
  });

  it('should handle progress going from 0 to 100 directly (milestone skip)', () => {
    const { rerender } = render(<UploadProgress progress={0} onCancel={vi.fn()} />);
    rerender(<UploadProgress progress={100} onCancel={vi.fn()} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion.textContent).toContain('cover.upload.completeAnnouncement');
  });
});
