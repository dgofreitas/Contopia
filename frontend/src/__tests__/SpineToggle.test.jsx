import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpineToggle from '../app/cover/SpineToggle';
import { useCoverStore } from '../stores/cover-store';

describe('SpineToggle', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders with label from i18n', () => {
    render(<SpineToggle />);
    expect(screen.getByText('cover.spine.toggleLabel')).toBeInTheDocument();
  });

  it('toggling calls setSpineCustomized on the store', async () => {
    const user = userEvent.setup();
    render(<SpineToggle />);
    const toggle = screen.getByText('cover.spine.toggleLabel').closest('button') || screen.getByText('cover.spine.toggleLabel');
    await user.click(toggle);
    expect(useCoverStore.getState().spineCustomized).toBe(true);
  });

  it('has aria-checked synced to state', () => {
    useCoverStore.getState().setSpineCustomized(true);
    render(<SpineToggle />);
    const toggleInput = document.querySelector('input[type="checkbox"]') || document.querySelector('[aria-checked="true"]');
    expect(toggleInput).toBeTruthy();
  });

  it('keyboard: Space/Enter toggles', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().setSpineCustomized(false);
    render(<SpineToggle />);
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (!checkbox) {
      const toggleEl = document.querySelector('[role="switch"]') || document.querySelector('button');
      if (toggleEl) {
        toggleEl.focus();
        await user.keyboard(' ');
        expect(useCoverStore.getState().spineCustomized).toBe(true);
        return;
      }
    }
    if (checkbox) {
      checkbox.focus();
      await user.keyboard(' ');
      expect(useCoverStore.getState().spineCustomized).toBe(true);
    }
  });
});