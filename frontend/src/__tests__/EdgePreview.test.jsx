// Contopia — EdgePreview Component Tests (STORY-026)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EdgePreview from '../app/cover/EdgePreview';

describe('EdgePreview', () => {
  it('renders with given edgeColor in standalone mode', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div).toBeInTheDocument();
    expect(div.style.getPropertyValue('--edge-color')).toBe('#FF6B6B');
  });

  it('applies correct CSS class for pattern', () => {
    const { container } = render(<EdgePreview edgeColor="#4ECDC4" edgePattern="dots" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div).toHaveClass('cover-edge--dots');
  });

  it('applies correct CSS class for solid pattern', () => {
    const { container } = render(<EdgePreview edgeColor="#4ECDC4" edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div).toHaveClass('cover-edge--solid');
  });

  it('uses cover-edge class when standalone is false (inline mode)', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={false} />);
    expect(container.querySelector('.cover-edge')).toBeInTheDocument();
    expect(container.querySelector('.cover-edge-preview')).not.toBeInTheDocument();
  });

  it('has minHeight in standalone mode', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div.style.minHeight).toBe('80px');
  });

  it('has aria-live="polite" in standalone mode', () => {
    render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = screen.getByRole('img');
    expect(div).toHaveAttribute('aria-live', 'polite');
  });

  it('has role="img" in standalone mode', () => {
    render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = screen.getByRole('img');
    expect(div).toBeInTheDocument();
  });

  it('has aria-label in standalone mode', () => {
    render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = screen.getByRole('img');
    expect(div).toHaveAttribute('aria-label');
    expect(div.getAttribute('aria-label')).toContain('cover.aria.edgePreview');
  });

  it('has aria-hidden="true" when standalone is false', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={false} />);
    const div = container.querySelector('.cover-edge');
    expect(div).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to solid pattern when edgePattern is invalid', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="invalid-pattern" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    // Should fall back to first pattern (solid)
    expect(div).toHaveClass('cover-edge--solid');
  });

  it('renders fallback --edge-color when edgeColor is null', () => {
    const { container } = render(<EdgePreview edgeColor={null} edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div.style.getPropertyValue('--edge-color')).toBe('rgba(0, 0, 0, 0.2)');
  });

  it('renders fallback --edge-color-dark when edgeColor is null', () => {
    const { container } = render(<EdgePreview edgeColor={null} edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    expect(div.style.getPropertyValue('--edge-color-dark')).toBe('rgba(0, 0, 0, 0.4)');
  });

  it('generates --edge-color-dark for valid hex', () => {
    const { container } = render(<EdgePreview edgeColor="#4ECDC4" edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    const darkColor = div.style.getPropertyValue('--edge-color-dark');
    expect(darkColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(darkColor).not.toBe('#4ECDC4');
  });

  it('renders with darkenColor creating different --edge-color-dark', () => {
    const { container } = render(<EdgePreview edgeColor="#FF6B6B" edgePattern="solid" standalone={true} />);
    const div = container.querySelector('.cover-edge-preview');
    const darkColor = div.style.getPropertyValue('--edge-color-dark');
    expect(darkColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(darkColor).not.toBe('#FF6B6B');
    // 50 less on each channel: #FF6B6B -> #CD3939 (255-50=205, 107-50=57, 107-50=57)
    expect(darkColor).toBe('#cd3939');
  });

  it('renders gradient pattern with correct CSS class', () => {
    const { container } = render(<EdgePreview edgeColor="#45B7D1" edgePattern="gradient" standalone={true} />);
    expect(container.querySelector('.cover-edge--gradient')).toBeInTheDocument();
  });

  it('renders marbling pattern with correct CSS class', () => {
    const { container } = render(<EdgePreview edgeColor="#96CEB4" edgePattern="marbling" standalone={true} />);
    expect(container.querySelector('.cover-edge--marbling')).toBeInTheDocument();
  });

  it('renders chevron pattern with correct CSS class', () => {
    const { container } = render(<EdgePreview edgeColor="#FFEAA7" edgePattern="chevron" standalone={true} />);
    expect(container.querySelector('.cover-edge--chevron')).toBeInTheDocument();
  });
});
