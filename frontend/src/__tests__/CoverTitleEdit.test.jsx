// Contopia — CoverTitleEdit Component Tests (STORY-024 §7.6)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverTitleEdit from '../app/cover/CoverTitleEdit';
import { useCoverStore } from '../stores/cover-store';

describe('CoverTitleEdit', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders book title from prop when coverTitle is null', () => {
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    expect(screen.getByText('My Book')).toBeInTheDocument();
  });

  it('renders coverTitle from store when set', () => {
    useCoverStore.getState().setCoverTitle('Custom Title');
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('My Book')).not.toBeInTheDocument();
  });

  it('falls back to bookTitle when coverTitle is null', () => {
    render(<CoverTitleEdit bookTitle="Fallback Title" textColor="#000000" />);
    expect(screen.getByText('Fallback Title')).toBeInTheDocument();
  });

  it('renders as button when not editing', () => {
    render(<CoverTitleEdit bookTitle="Title" textColor="#000000" />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('is a native button element', () => {
    render(<CoverTitleEdit bookTitle="Title" textColor="#000000" />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('enters edit mode on click', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('My Book');
  });

  it('enters edit mode on Enter key on h2', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    const heading = screen.getByRole('button');
    heading.focus();
    await user.keyboard('{Enter}');
    const input = screen.queryByRole('textbox');
    // The Enter key event on the h2 fires handleClick
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('input has maxLength={120}', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '120');
  });

  it('auto-focuses the input when entering edit mode', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    expect(document.activeElement).toBe(input);
  });

  it('saves sanitized text on blur', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Title');
    // Blur the input by tabbing
    await user.tab();
    expect(useCoverStore.getState().coverTitle).toBe('New Title');
  });

  it('saves sanitized text on Enter', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Entered Title{Enter}');
    expect(useCoverStore.getState().coverTitle).toBe('Entered Title');
  });

  it('cancels editing on Escape', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="Original" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Cancelled');
    await user.keyboard('{Escape}');
    // Should revert to display view
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(useCoverStore.getState().coverTitle).toBeNull();
  });

  it('sanitizes HTML in title (XSS)', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="Safe" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '<script>alert(1)</script>');
    await user.tab();
    // sanitizeText strips all tags. The value becomes '' which becomes null.
    expect(useCoverStore.getState().coverTitle).toBeNull();
  });

  it('sanitizes img onerror XSS', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="Safe" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '<img onerror=alert(1) src=x>');
    await user.tab();
    // img tag is stripped, resulting value becomes null
    expect(useCoverStore.getState().coverTitle).toBeNull();
  });

  it('has aria-label on input when editing', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label');
  });

  it('has aria-label on heading when not editing', () => {
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    const heading = screen.getByRole('button');
    expect(heading).toHaveAttribute('aria-label');
  });

  it('sets coverTitle to null when sanitized value is empty', async () => {
    useCoverStore.getState().setCoverTitle('Existing');
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.tab();
    expect(useCoverStore.getState().coverTitle).toBeNull();
  });

  it('has auto-scale class based on title length', () => {
    // Short title (<30 chars) → cover-title-short
    render(<CoverTitleEdit bookTitle="Short" textColor="#000000" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('cover-title-short');
  });

  it('uses cover-title-medium for 31-60 char titles', () => {
    const medium = 'A'.repeat(31);
    render(<CoverTitleEdit bookTitle={medium} textColor="#000000" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('cover-title-medium');
  });

  it('uses cover-title-long for >60 char titles', () => {
    const long = 'A'.repeat(61);
    render(<CoverTitleEdit bookTitle={long} textColor="#000000" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('cover-title-long');
  });

  it('returns to button view after Enter saves', async () => {
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Final{Enter}');
    // Should be back in button view
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('sets coverTitle to null when sanitized text is empty', async () => {
    useCoverStore.getState().setCoverTitle('Old');
    const user = userEvent.setup();
    render(<CoverTitleEdit bookTitle="My Book" textColor="#000000" />);
    // After reset, coverTitle is null. The display shows bookTitle "My Book".
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.tab();
    // Draft is empty string, sanitize returns '', setCoverTitle(null)
    expect(useCoverStore.getState().coverTitle).toBeNull();
  });
});
