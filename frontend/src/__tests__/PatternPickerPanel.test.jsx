// Contopia — PatternPickerPanel Component Tests (STORY-023)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatternPickerPanel from '../app/cover/PatternPickerPanel';
import { COVER_PATTERNS } from '../lib/cover-patterns';

describe('PatternPickerPanel', () => {
  const baseColor = '#87CEEB';

  describe('rendering', () => {
    it('renders a section element', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders heading with pattern picker label', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('cover.customize.patternPickerHeading');
    });

    it('renders pattern picker group with proper aria-label', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'cover.aria.patternPickerGroup');
    });

    it('renders all patterns from COVER_PATTERNS', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });
  });

  describe('horizontal scroll layout (mobile)', () => {
    it('has flex layout on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('flex');
    });

    it('has overflow-x-auto for horizontal scrolling on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('overflow-x-auto');
    });

    it('has scroll-smooth for smooth scrolling on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('scroll-smooth');
    });

    it('has snap-x and snap-mandatory for snap scrolling on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('snap-x');
      expect(group.className).toContain('snap-mandatory');
    });

    it('has shrink-0 on each pattern wrapper on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const wrappers = container.querySelectorAll('.shrink-0');
      expect(wrappers.length).toBe(COVER_PATTERNS.length);
    });

    it('has snap-start on each pattern wrapper on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const wrappers = container.querySelectorAll('.snap-start');
      expect(wrappers.length).toBe(COVER_PATTERNS.length);
    });
  });

  describe('grid layout (sm breakpoint)', () => {
    it('has sm:grid layout on larger screens', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('sm:grid');
    });

    it('has sm:grid-cols-4 on sm breakpoint', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('sm:grid-cols-4');
    });

    it('has sm:overflow-x-visible on larger screens (no horizontal scroll)', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('sm:overflow-x-visible');
    });

    it('has sm:snap-none on larger screens (no snap)', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('sm:snap-none');
    });

    it('has sm:shrink on larger screens', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const wrappers = container.querySelectorAll('.sm\\:shrink');
      expect(wrappers.length).toBe(COVER_PATTERNS.length);
    });
  });

  describe('grid layout (lg breakpoint)', () => {
    it('has lg:grid-cols-6 on lg breakpoint', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('lg:grid-cols-6');
    });
  });

  describe('spacing', () => {
    it('has gap-2 on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('gap-2');
    });

    it('has sm:gap-3 on larger screens', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('sm:gap-3');
    });

    it('has p-2 padding on mobile', () => {
      const { container } = render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group.className).toContain('p-2');
    });
  });

  describe('selected state', () => {
    it('renders selected state when a pattern is selected', () => {
      render(<PatternPickerPanel selectedPattern='stripes' onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton).toBeInTheDocument();
    });

    it('has aria-pressed="true" on the selected pattern', () => {
      render(<PatternPickerPanel selectedPattern='stripes' onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('has aria-pressed="false" on unselected patterns', () => {
      render(<PatternPickerPanel selectedPattern='stripes' onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      const unselectedButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'false');
      expect(unselectedButtons.length).toBeGreaterThan(0);
    });

    it('shows selected ring on the selected pattern', () => {
      render(<PatternPickerPanel selectedPattern='stripes' onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(btn => btn.getAttribute('aria-pressed') === 'true');
      expect(selectedButton.className).toContain('ring-2');
    });
  });

  describe('interaction', () => {
    it('calls onSelectPattern with correct id when pattern swatch is clicked', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      expect(onSelectPattern).toHaveBeenCalledWith(COVER_PATTERNS[0].id);
    });

    it('calls onSelectPattern when second pattern swatch is clicked', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);
      expect(onSelectPattern).toHaveBeenCalledWith(COVER_PATTERNS[1].id);
    });

    it('updates selected pattern when a new pattern is clicked', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern='stripes' onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);
      expect(onSelectPattern).toHaveBeenCalledWith(COVER_PATTERNS[1].id);
    });
  });

  describe('keyboard navigation (accessibility)', () => {
    it('allows Tab navigation through pattern swatches', async () => {
      const user = userEvent.setup();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      // First button should be focusable
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
    });

    it('activates pattern selection with Enter key', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      expect(onSelectPattern).toHaveBeenCalledWith(COVER_PATTERNS[0].id);
    });

    it('activates pattern selection with Space key', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      await user.keyboard(' ');
      expect(onSelectPattern).toHaveBeenCalledWith(COVER_PATTERNS[0].id);
    });
  });

  describe('edge cases', () => {
    it('renders with null selectedPattern', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });

    it('renders with undefined selectedPattern', () => {
      render(<PatternPickerPanel selectedPattern={undefined} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });

    it('renders with empty string selectedPattern', () => {
      render(<PatternPickerPanel selectedPattern="" onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });

    it('handles onSelectPattern being called multiple times', async () => {
      const user = userEvent.setup();
      const onSelectPattern = vi.fn();
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={onSelectPattern} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      await user.click(buttons[1]);
      await user.click(buttons[2]);
      expect(onSelectPattern).toHaveBeenCalledTimes(3);
    });

    it('handles null baseColor gracefully', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={null} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });

    it('handles undefined baseColor gracefully', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={undefined} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(COVER_PATTERNS.length);
    });
  });

  describe('pattern validation (NFR-SEC-04)', () => {
    it('ensures all patterns have required properties', () => {
      COVER_PATTERNS.forEach(pattern => {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('nameKey');
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('cssClass');
        expect(typeof pattern.id).toBe('string');
        expect(typeof pattern.nameKey).toBe('string');
        expect(typeof pattern.type).toBe('string');
      });
    });

    it('has "none" pattern with cssClass null', () => {
      const nonePattern = COVER_PATTERNS.find(p => p.id === 'none');
      expect(nonePattern).toBeDefined();
      expect(nonePattern.cssClass).toBeNull();
    });

    it('has all other patterns with valid cssClass strings', () => {
      COVER_PATTERNS.filter(p => p.id !== 'none').forEach(pattern => {
        expect(pattern.cssClass).toBeTruthy();
        expect(typeof pattern.cssClass).toBe('string');
      });
    });
  });

  describe('accessibility (NFR-ACC-01)', () => {
    it('has role="group" on pattern container', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
    });

    it('has aria-label on group describing pattern picker', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label');
    });

    it('all pattern buttons are keyboard accessible', () => {
      render(<PatternPickerPanel selectedPattern={null} onSelectPattern={vi.fn()} baseColor={baseColor} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.tagName).toBe('BUTTON');
        expect(btn).toHaveAttribute('type', 'button');
      });
    });
  });
});