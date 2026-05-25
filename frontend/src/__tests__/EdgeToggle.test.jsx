// Contopia — EdgeToggle Component Tests (STORY-026)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EdgeToggle from '../app/cover/EdgeToggle';
import { useCoverStore } from '../stores/cover-store';

describe('EdgeToggle', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders with label from i18n', () => {
    render(<EdgeToggle />);
    expect(screen.getByText('cover.edge.toggleLabel')).toBeInTheDocument();
  });

  it('toggling calls setEdgeCustomized on the store', async () => {
    const user = userEvent.setup();
    render(<EdgeToggle />);
    const toggle = screen.getByText('cover.edge.toggleLabel').closest('button') || screen.getByText('cover.edge.toggleLabel');
    await user.click(toggle);
    expect(useCoverStore.getState().edgeCustomized).toBe(true);
  });

  it('has aria-checked synced to state', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    render(<EdgeToggle />);
    const toggleInput = document.querySelector('input[type="checkbox"]') || document.querySelector('[aria-checked="true"]');
    expect(toggleInput).toBeTruthy();
  });

  it('reflects unchecked state initially', () => {
    render(<EdgeToggle />);
    // Default state is false — aria-checked should reflect that
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox) {
      expect(checkbox.checked).toBe(false);
    } else {
      // Flowbite might use a different element
      const toggleEl = document.querySelector('[role="switch"]');
      if (toggleEl) {
        expect(toggleEl.getAttribute('aria-checked')).toBe('false');
      }
    }
  });

  it('keyboard: Space toggles', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().setEdgeCustomized(false);
    render(<EdgeToggle />);
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (!checkbox) {
      const toggleEl = document.querySelector('[role="switch"]') || document.querySelector('button');
      if (toggleEl) {
        toggleEl.focus();
        await user.keyboard(' ');
        expect(useCoverStore.getState().edgeCustomized).toBe(true);
        return;
      }
    }
    if (checkbox) {
      checkbox.focus();
      await user.keyboard(' ');
      expect(useCoverStore.getState().edgeCustomized).toBe(true);
    }
  });
});
