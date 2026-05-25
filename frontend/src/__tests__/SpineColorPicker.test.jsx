import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpineColorPicker from '../app/cover/SpineColorPicker';
import { useCoverStore } from '../stores/cover-store';
import { COVER_COLOR_PALETTE } from '../lib/cover-color-palette';

describe('SpineColorPicker', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders color swatches', () => {
    render(<SpineColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
  });

  it('clicking a swatch calls setSpineColor on the store', async () => {
    const user = userEvent.setup();
    render(<SpineColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    await user.click(buttons[0]);
    expect(useCoverStore.getState().spineColor).toBe(COVER_COLOR_PALETTE[0].hex);
  });

  it('selected swatch reflects current store value', () => {
    useCoverStore.getState().setSpineColor(COVER_COLOR_PALETTE[2].hex);
    render(<SpineColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('has role="group" and aria-label present', () => {
    render(<SpineColorPicker />);
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'cover.aria.spineColorPickerGroup');
  });
});