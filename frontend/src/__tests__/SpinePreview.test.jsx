import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpinePreview from '../app/cover/SpinePreview';

function renderWithProps(props) {
  return render(<SpinePreview {...props} />);
}

describe('SpinePreview', () => {
  it('renders with given spineColor and title vertical text', () => {
    const { container } = renderWithProps({ spineColor: '#0f0c29', title: 'My Book' });
    const div = container.querySelector('.cover-spine-preview');
    expect(div).toBeInTheDocument();
    expect(div.style.backgroundColor).toBe('rgb(15, 12, 41)');
    expect(container.querySelector('span')).toHaveTextContent('My Book');
  });

  it('applies correct aria-label', () => {
    const { container } = renderWithProps({ spineColor: '#0f0c29', title: 'My Book' });
    const div = container.querySelector('.cover-spine-preview');
    expect(div).toHaveAttribute('role', 'img');
    expect(div).toHaveAttribute('aria-label');
  });

  it('proportional mode uses aspect-ratio style', () => {
    const { container } = renderWithProps({ spineColor: '#0f0c29', title: 'My Book', proportional: true });
    const div = container.querySelector('.cover-spine-preview');
    expect(div.style.aspectRatio).toBe('2 / 7');
  });

  it('inline mode uses absolute positioning', () => {
    const { container } = renderWithProps({ spineColor: '#0f0c29', title: 'My Book', proportional: false });
    const div = container.querySelector('.cover-spine-preview--inline');
    expect(div).toBeInTheDocument();
    expect(div.style.position).toBe('absolute');
  });

  it('truncates long titles with ellipsis — verify it renders the span', () => {
    const { container } = renderWithProps({ spineColor: '#0f0c29', title: 'A Very Long Title That Should Be Truncated' });
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span.style.textOverflow).toBe('ellipsis');
    expect(span.style.overflow).toBe('hidden');
    expect(span.style.whiteSpace).toBe('nowrap');
  });

  it('renders fallback background when spineColor is null', () => {
    const { container } = renderWithProps({ spineColor: null, title: 'My Book' });
    const div = container.querySelector('.cover-spine-preview');
    expect(div).toBeInTheDocument();
    expect(div.style.backgroundColor).toBe('rgba(0, 0, 0, 0.2)');
  });
});