// Contopia — TemplateCard Component Tests (STORY-022)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateCard from '../app/cover/TemplateCard';

const template = {
  id: 'galaxy',
  nameKey: 'cover.templates.galaxy',
  descriptionKey: 'cover.templates.galaxyDesc',
  background: { type: 'gradient', colors: ['#0f0c29', '#302b63', '#24243e'] },
  decoration: { type: 'stars' },
  textColor: '#ffffff',
  accentColor: '#ffd700',
};

describe('TemplateCard', () => {
  describe('rendering', () => {
    it('renders as a button element', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });

    it('renders the template name from i18n key', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      // i18n mock passes through key: 'cover.templates.galaxy'
      expect(screen.getByText('cover.templates.galaxy')).toBeInTheDocument();
    });

    it('has aria-label with select template instruction, name, and description', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      // i18n mock: 'aria.selectTemplate' passes through, plus name+desc keys
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toContain('aria.selectTemplate');
      expect(btn.getAttribute('aria-label')).toContain('cover.templates.galaxy');
      expect(btn.getAttribute('aria-label')).toContain('cover.templates.galaxyDesc');
    });

    it('does not include selected suffix when not selected', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.getAttribute('aria-label')).not.toContain('aria.selected');
    });

    it('does not have aria-pressed when not selected', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      // aria-pressed is only rendered when truthy — not present when false
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
    });

    it('has a preview div with cover-template--{id} class', () => {
      const { container } = render(<TemplateCard template={template} onSelect={vi.fn()} />);
      const preview = container.querySelector('.cover-template--galaxy');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('selected state', () => {
    it('shows selected ring when isSelected is true', () => {
      render(<TemplateCard template={template} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn.className).toContain('ring-2');
      expect(btn.className).toContain('ring-blue-500');
      expect(btn.className).toContain('scale-105');
    });

    it('includes selected suffix in aria-label when selected', () => {
      render(<TemplateCard template={template} isSelected={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn.getAttribute('aria-label')).toContain('aria.selected');
    });

    it('uses blue text color for selected template name', () => {
      render(<TemplateCard template={template} isSelected={true} onSelect={vi.fn()} />);
      const nameSpan = screen.getByText('cover.templates.galaxy');
      expect(nameSpan.style.color).toBe('rgb(37, 99, 235)'); // #2563eb
    });

    it('uses gray text color when not selected', () => {
      render(<TemplateCard template={template} onSelect={vi.fn()} />);
      const nameSpan = screen.getByText('cover.templates.galaxy');
      expect(nameSpan.style.color).toBe('rgb(55, 65, 81)'); // #374151
    });
  });

  describe('interaction', () => {
    it('calls onSelect with template id when clicked', () => {
      const onSelect = vi.fn();
      render(<TemplateCard template={template} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onSelect).toHaveBeenCalledWith('galaxy');
    });

    it('does not call onSelect when disabled', () => {
      const onSelect = vi.fn();
      render(<TemplateCard template={template} disabled={true} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('has disabled styles when disabled', () => {
      render(<TemplateCard template={template} disabled={true} onSelect={vi.fn()} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(btn.className).toContain('opacity-50');
      expect(btn.className).toContain('cursor-not-allowed');
    });
  });
});
