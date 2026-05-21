// Contopia — TemplateGallery Component Tests (STORY-022)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateGallery from '../app/cover/TemplateGallery';
import { COVER_TEMPLATES } from '../lib/cover-templates';

describe('TemplateGallery', () => {
  it('renders all template cards', () => {
    render(<TemplateGallery templates={COVER_TEMPLATES} onSelect={vi.fn()} />);
    // Each template renders a button — count them
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(COVER_TEMPLATES.length);
  });

  it('renders with role="group" and aria-label', () => {
    render(<TemplateGallery templates={COVER_TEMPLATES} onSelect={vi.fn()} />);
    const group = screen.getByRole('group');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('aria-label', 'Template gallery');
  });

  it('marks selected template card', () => {
    render(<TemplateGallery templates={COVER_TEMPLATES} selectedId="ocean" onSelect={vi.fn()} />);
    const selectedBtn = screen.getByRole('button', { pressed: true });
    expect(selectedBtn).toBeInTheDocument();
    // The selected button should have ring classes
    expect(selectedBtn.className).toContain('ring-2');
  });

  it('calls onSelect with template id when a card is clicked', () => {
    const onSelect = vi.fn();
    render(<TemplateGallery templates={COVER_TEMPLATES} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(COVER_TEMPLATES[0].id);
  });

  it('renders empty when templates array is empty', () => {
    const { container } = render(<TemplateGallery templates={[]} onSelect={vi.fn()} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  it('each template card has min-w-[140px] wrapper for horizontal scroll', () => {
    const { container } = render(<TemplateGallery templates={COVER_TEMPLATES} onSelect={vi.fn()} />);
    const wrappers = container.querySelectorAll('.min-w-\\[140px\\]');
    expect(wrappers.length).toBe(COVER_TEMPLATES.length);
  });

  it('does not mark any selected when selectedId is null', () => {
    render(<TemplateGallery templates={COVER_TEMPLATES} selectedId={null} onSelect={vi.fn()} />);
    const pressedButtons = screen.queryAllByRole('button', { pressed: true });
    expect(pressedButtons).toHaveLength(0);
  });

  it('marks correct template selected when selectedId matches', () => {
    render(<TemplateGallery templates={COVER_TEMPLATES} selectedId="rainbow" onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { pressed: true });
    expect(btn).toBeInTheDocument();
    // The template name should be visible
    expect(screen.getByText('cover.templates.rainbow')).toBeInTheDocument();
  });
});
