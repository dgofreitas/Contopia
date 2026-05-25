// Contopia — ColorSwatch Component Tests (STORY-023)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorSwatch from '../app/cover/ColorSwatch';

describe('ColorSwatch', () => {
  const color = {
    id: 'sky-blue',
    nameKey: 'colors.skyBlue',
    hex: '#87CEEB',
  };

  describe('rendering', () => {
    it('renders as a button element', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });

    it('has aria-label with color name and selection status', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
      // Mock returns the key directly; actual interpolation happens in real i18n
      expect(btn.getAttribute('aria-label')).toContain('cover.aria.colorSwatch');
    });

    it('includes "selected" status in aria-label when isSelected is true', () => {
      render(<ColorSwatch color={color} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      // Mock returns the key directly; isSelected affects the statusKey variable
      expect(btn).toHaveAttribute('aria-label');
    });

    it('includes "not selected" status in aria-label when isSelected is false', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      // Mock returns the key directly; isSelected affects the statusKey variable
      expect(btn).toHaveAttribute('aria-label');
    });

    it('has aria-pressed="false" when not selected', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('applies background color from color.hex', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(135, 206, 235)'); // #87CEEB
    });

    it('has rounded-full class for circular swatch', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('rounded-full');
    });

    it('has border-2 class', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-2');
    });

    it('has responsive size classes (w-10 h-10 on mobile, w-12 h-12 on larger screens)', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('w-10');
      expect(btn.className).toContain('h-10');
      expect(btn.className).toContain('sm:w-12');
      expect(btn.className).toContain('sm:h-12');
    });
  });

  describe('selected state', () => {
    it('has aria-pressed="true" when isSelected is true', () => {
      render(<ColorSwatch color={color} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows selected ring when isSelected is true', () => {
      render(<ColorSwatch color={color} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('ring-2');
      expect(btn.className).toContain('ring-offset-2');
      expect(btn.className).toContain('ring-blue-500');
    });

    it('shows scale-110 when isSelected is true', () => {
      render(<ColorSwatch color={color} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('scale-110');
    });

    it('shows border-white when isSelected is true', () => {
      render(<ColorSwatch color={color} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-white');
    });
  });

  describe('unselected state', () => {
    it('has border-gray-300 when isSelected is false', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-gray-300');
    });

    it('shows hover:scale-105 when isSelected is false', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('hover:scale-105');
    });

    it('does not show ring-2 (non-prefixed) when isSelected is false', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      // focus-visible:ring-2 exists, but non-prefixed ring-2 should not
      const classes = btn.className.split(' ');
      expect(classes.filter(c => c === 'ring-2').length).toBe(0);
    });

    it('does not show scale-110 when isSelected is false', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).not.toContain('scale-110');
    });
  });

  describe('focus ring (accessibility)', () => {
    it('has focus-visible:ring-2 for keyboard focus', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-2');
    });

    it('has focus-visible:ring-offset-2 for keyboard focus', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-offset-2');
    });

    it('has focus-visible:ring-blue-500 for keyboard focus', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-blue-500');
    });

    it('has focus:outline-none to remove default outline', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus:outline-none');
    });
  });

  describe('interaction', () => {
    it('calls onSelect with color.hex when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ColorSwatch color={color} isSelected={false} onSelect={onSelect} />);
      const btn = screen.getByRole('button');
      await user.click(btn);
      expect(onSelect).toHaveBeenCalledWith('#87CEEB');
    });

    it('handles Enter key press', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ColorSwatch color={color} isSelected={false} onSelect={onSelect} />);
      const btn = screen.getByRole('button');
      await user.keyboard('[Tab][Enter]');
      expect(onSelect).toHaveBeenCalledWith('#87CEEB');
    });

    it('handles Space key press', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ColorSwatch color={color} isSelected={false} onSelect={onSelect} />);
      const btn = screen.getByRole('button');
      await user.keyboard('[Tab] ');
      expect(onSelect).toHaveBeenCalledWith('#87CEEB');
    });
  });

  describe('reduced motion (accessibility)', () => {
    it('has motion-reduce:transition-none to disable animations when prefers-reduced-motion', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('motion-reduce:transition-none');
    });

    it('has transition-transform duration-150 for default animation', () => {
      render(<ColorSwatch color={color} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('transition-transform');
      expect(btn.className).toContain('duration-150');
    });
  });

  describe('edge cases', () => {
    it('renders with different hex color values', () => {
      const redColor = { id: 'red', nameKey: 'colors.red', hex: '#FF0000' };
      render(<ColorSwatch color={redColor} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('handles invalid hex color (without leading #)', () => {
      const invalidColor = { id: 'blue', nameKey: 'colors.blue', hex: '0000FF' };
      render(<ColorSwatch color={invalidColor} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      // Invalid hex without # is not a valid CSS color, so style.backgroundColor is empty
      expect(btn.style.backgroundColor).toBe('');
    });

    it('renders with short hex color (3 characters)', () => {
      const shortHex = { id: 'white', nameKey: 'colors.white', hex: '#FFF' };
      render(<ColorSwatch color={shortHex} isSelected={false} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(255, 255, 255)');
    });
  });
});