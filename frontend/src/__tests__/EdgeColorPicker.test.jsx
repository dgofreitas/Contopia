// Contopia — EdgeColorPicker Component Tests (STORY-026)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EdgeColorPicker from '../app/cover/EdgeColorPicker';
import { useCoverStore } from '../stores/cover-store';
import { COVER_COLOR_PALETTE } from '../lib/cover-color-palette';

describe('EdgeColorPicker', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders color swatches', () => {
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
  });

  it('clicking a swatch calls setEdgeColor on the store', async () => {
    const user = userEvent.setup();
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    await user.click(buttons[0]);
    expect(useCoverStore.getState().edgeColor).toBe(COVER_COLOR_PALETTE[0].hex);
  });

  it('selected swatch reflects current store value', () => {
    useCoverStore.getState().setEdgeColor(COVER_COLOR_PALETTE[2].hex);
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('has role="group" and aria-label present', () => {
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'cover.aria.edgeColorPickerGroup');
  });

  it('no swatch is selected when edgeColor is null', () => {
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    const buttons = within(group).getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeFalsy();
  });

  it('renders grid layout with responsive columns', () => {
    render(<EdgeColorPicker />);
    const group = screen.getByRole('group');
    expect(group.className).toContain('grid');
    expect(group.className).toContain('grid-cols-4');
  });
});
