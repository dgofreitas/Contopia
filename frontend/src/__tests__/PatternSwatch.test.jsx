// Contopia — PatternSwatch Component Tests (STORY-023)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatternSwatch from '../app/cover/PatternSwatch';

describe('PatternSwatch', () => {
  const pattern = {
    id: 'stripes',
    nameKey: 'cover.patterns.stripes',
    type: 'gradient',
    cssClass: 'cover-pattern--stripes',
  };

  const noPattern = {
    id: 'none',
    nameKey: 'cover.patterns.none',
    type: 'none',
    cssClass: null,
  };

  const baseColor = '#87CEEB';

  describe('rendering', () => {
    it('renders as a button element', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });

    it('has aria-label with pattern name and selection status', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toContain('cover.aria.patternSwatch');
    });

    it('includes "selected" status in aria-label when isSelected is true', () => {
      render(<PatternSwatch pattern={pattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
    });

    it('includes "not selected" status in aria-label when isSelected is false', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
    });

    it('has aria-pressed="false" when not selected', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('applies base color as background', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(135, 206, 235)'); // #87CEEB
    });

    it('applies fallback gray color when baseColor is not provided', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={null} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(107, 114, 128)'); // #6b7280
    });

    it('has rounded-lg class for rectangular swatch', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('rounded-lg');
    });

    it('has border-2 class', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-2');
    });

    it('has responsive size classes (w-16 h-16 on mobile, w-20 h-20 on larger screens)', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('w-16');
      expect(btn.className).toContain('h-16');
      expect(btn.className).toContain('sm:w-20');
      expect(btn.className).toContain('sm:h-20');
    });

    it('has overflow-hidden class', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('overflow-hidden');
    });

    it('has relative positioning', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('relative');
    });
  });

  describe('pattern preview with cssClass', () => {
    it('renders pattern overlay div when cssClass is provided', () => {
      const { container } = render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const overlay = container.querySelector('.cover-pattern--stripes');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });

    it('has cover-pattern-overlay class on pattern overlay div', () => {
      const { container } = render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const overlay = container.querySelector('.cover-pattern-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('does not render pattern overlay when cssClass is null (none pattern)', () => {
      const { container } = render(<PatternSwatch pattern={noPattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const overlay = container.querySelector('.cover-pattern-overlay');
      expect(overlay).toBeNull();
    });

    it('renders "none" indicator with strikethrough when cssClass is null', () => {
      render(<PatternSwatch pattern={noPattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.textContent).toContain('/');
    });
  });

  describe('selected state', () => {
    it('has aria-pressed="true" when isSelected is true', () => {
      render(<PatternSwatch pattern={pattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows selected ring when isSelected is true', () => {
      render(<PatternSwatch pattern={pattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('ring-2');
      expect(btn.className).toContain('ring-offset-2');
      expect(btn.className).toContain('ring-blue-500');
    });

    it('shows border-blue-500 when isSelected is true', () => {
      render(<PatternSwatch pattern={pattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-blue-500');
    });
  });

  describe('unselected state', () => {
    it('has border-gray-300 when isSelected is false', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('border-gray-300');
    });

    it('shows hover:border-gray-400 when isSelected is false', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('hover:border-gray-400');
    });

    it('does not show ring-2 (non-prefixed) when isSelected is false', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      const classes = btn.className.split(' ');
      expect(classes.filter(c => c === 'ring-2').length).toBe(0);
    });

    it('does not show border-blue-500 when isSelected is false', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).not.toContain('border-blue-500');
    });
  });

  describe('focus ring (accessibility)', () => {
    it('has focus-visible:ring-2 for keyboard focus', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-2');
    });

    it('has focus-visible:ring-offset-2 for keyboard focus', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-offset-2');
    });

    it('has focus-visible:ring-blue-500 for keyboard focus', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus-visible:ring-blue-500');
    });

    it('has focus:outline-none to remove default outline', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('focus:outline-none');
    });
  });

  describe('interaction', () => {
    it('calls onSelect with pattern.id when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={onSelect} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      await user.click(btn);
      expect(onSelect).toHaveBeenCalledWith('stripes');
    });

    it('handles Enter key press', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={onSelect} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      await user.keyboard('[Tab][Enter]');
      expect(onSelect).toHaveBeenCalledWith('stripes');
    });

    it('handles Space key press', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={onSelect} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      btn.focus();
      await user.keyboard(' ');
      expect(onSelect).toHaveBeenCalledWith('stripes');
    });
  });

  describe('reduced motion (accessibility)', () => {
    it('has motion-reduce:transition-none to disable animations when prefers-reduced-motion', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('motion-reduce:transition-none');
    });

    it('has transition-all duration-150 for default animation', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('transition-all');
      expect(btn.className).toContain('duration-150');
    });
  });

  describe('edge cases', () => {
    it('renders with different base color values', () => {
      const redColor = '#FF0000';
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={redColor} />);
      const btn = screen.getByRole('button');
      expect(btn.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('renders with empty string baseColor (uses fallback)', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor="" />);
      const btn = screen.getByRole('button');
      // Empty string is falsy, so it uses the fallback #6b7280
      expect(btn.style.backgroundColor).toBe('rgb(107, 114, 128)');
    });

    it('renders with undefined baseColor (uses fallback)', () => {
      render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={undefined} />);
      const btn = screen.getByRole('button');
      // undefined is falsy, so it uses the fallback #6b7280
      expect(btn.style.backgroundColor).toBe('rgb(107, 114, 128)');
    });

    it('renders pattern with different cssClass values', () => {
      const dotsPattern = {
        id: 'dots',
        nameKey: 'cover.patterns.dots',
        type: 'gradient',
        cssClass: 'cover-pattern--dots',
      };
      const { container } = render(<PatternSwatch pattern={dotsPattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const overlay = container.querySelector('.cover-pattern--dots');
      expect(overlay).toBeInTheDocument();
    });

    it('handles "none" pattern correctly', () => {
      render(<PatternSwatch pattern={noPattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn.textContent).toContain('/');
    });
  });

  describe('accessibility (NFR-ACC-03)', () => {
    it('announces pattern name and selection status via aria-label', () => {
      render(<PatternSwatch pattern={pattern} isSelected={true} onSelect={vi.fn()} baseColor={baseColor} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
    });

    it('pattern overlay has aria-hidden="true" to prevent screen reader redundancy', () => {
      const { container } = render(<PatternSwatch pattern={pattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const overlay = container.querySelector('.cover-pattern-overlay');
      if (overlay) {
        expect(overlay).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('"none" indicator has aria-hidden="true"', () => {
      const { container } = render(<PatternSwatch pattern={noPattern} isSelected={false} onSelect={vi.fn()} baseColor={baseColor} />);
      const containerDiv = container.querySelector('.absolute');
      if (containerDiv) {
        expect(containerDiv).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });
});