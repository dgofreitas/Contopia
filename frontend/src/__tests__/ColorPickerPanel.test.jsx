// Contopia — ColorPickerPanel Component Tests (STORY-023)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPickerPanel from '../app/cover/ColorPickerPanel';
import { COVER_COLOR_PALETTE } from '../lib/cover-color-palette';

describe('ColorPickerPanel', () => {
  describe('rendering', () => {
    it('renders a section element', () => {
      const { container } = render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders heading with customization label', () => {
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('cover.customize.colorPickerHeading');
    });

    it('renders color picker group with proper aria-label', () => {
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'cover.aria.colorPickerGroup');
    });

    it('renders all colors from COVER_COLOR_PALETTE', () => {
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
    });

    it('renders each color swatch in a flex container div', () => {
      const { container } = render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const flexDivs = container.querySelectorAll('.justify-center');
      expect(flexDivs.length).toBe(COVER_COLOR_PALETTE.length);
    });
  });

  describe('grid layout', () => {
    it('has grid layout classes', () => {
      const { container } = render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('grid');
      expect(group.className).toContain('grid-cols-4');
      expect(group.className).toContain('sm:grid-cols-6');
      expect(group.className).toContain('lg:grid-cols-8');
    });

    it('has gap classes for spacing between swatches', () => {
      const { container } = render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('gap-2');
      expect(group.className).toContain('sm:gap-3');
    });
  });

  describe('selected state', () => {
    it('renders selected state when a color is selected', () => {
      render(<ColorPickerPanel selectedColor='#87CEEB' onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton).toBeInTheDocument();
    });

    it('has aria-pressed="true" on the selected color', () => {
      render(<ColorPickerPanel selectedColor='#87CEEB' onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('has aria-pressed="false" on unselected colors', () => {
      render(<ColorPickerPanel selectedColor='#87CEEB' onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      const unselectedButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'false');
      expect(unselectedButtons.length).toBeGreaterThan(0);
    });

    it('shows selected ring on the selected color', () => {
      render(<ColorPickerPanel selectedColor='#87CEEB' onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton.className).toContain('ring-2');
    });
  });

  describe('interaction', () => {
    it('calls onSelectColor with correct hex when color swatch is clicked', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      expect(onSelectColor).toHaveBeenCalledWith(COVER_COLOR_PALETTE[0].hex);
    });

    it('calls onSelectColor when second color swatch is clicked', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);
      expect(onSelectColor).toHaveBeenCalledWith(COVER_COLOR_PALETTE[1].hex);
    });

    it('updates selected color when a new color is clicked', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor='#87CEEB' onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);
      expect(onSelectColor).toHaveBeenCalledWith(COVER_COLOR_PALETTE[1].hex);
    });
  });

  describe('keyboard navigation (accessibility)', () => {
    it('allows Tab navigation through color swatches', async () => {
      const user = userEvent.setup();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      // First button should be focusable
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
    });

    it('activates color selection with Enter key', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      expect(onSelectColor).toHaveBeenCalledWith(COVER_COLOR_PALETTE[0].hex);
    });

    it('activates color selection with Space key', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      await user.keyboard(' ');
      expect(onSelectColor).toHaveBeenCalledWith(COVER_COLOR_PALETTE[0].hex);
    });
  });

  describe('edge cases', () => {
    it('renders with null selectedColor', () => {
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
    });

    it('renders with undefined selectedColor', () => {
      render(<ColorPickerPanel selectedColor={undefined} onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
    });

    it('renders with empty string selectedColor', () => {
      render(<ColorPickerPanel selectedColor="" onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
    });

    it('handles onSelectColor being called multiple times', async () => {
      const user = userEvent.setup();
      const onSelectColor = vi.fn();
      render(<ColorPickerPanel selectedColor={null} onSelectColor={onSelectColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      await user.click(buttons[1]);
      await user.click(buttons[2]);
      expect(onSelectColor).toHaveBeenCalledTimes(3);
    });

    it('handles invalid hex color being passed as selectedColor', () => {
      render(<ColorPickerPanel selectedColor="invalid-color" onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_COLOR_PALETTE.length);
      // No button should be selected since the color doesn't match any palette color
      const selectedButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButtons.length).toBe(0);
    });
  });

  describe('color palette validation (NFR-SEC-04)', () => {
    it('renders colors with valid hex format from COVER_COLOR_PALETTE', () => {
      render(<ColorPickerPanel selectedColor={null} onSelectColor={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn, index) => {
        const color = COVER_COLOR_PALETTE[index];
        const hexPattern = /^#[0-9A-F]{6}$/i;
        expect(color.hex).toMatch(hexPattern);
      });
    });

    it('ensures all palette colors have required properties', () => {
      COVER_COLOR_PALETTE.forEach(color => {
        expect(color).toHaveProperty('id');
        expect(color).toHaveProperty('hex');
        expect(color).toHaveProperty('nameKey');
        expect(typeof color.id).toBe('string');
        expect(typeof color.hex).toBe('string');
        expect(typeof color.nameKey).toBe('string');
      });
    });
  });
});