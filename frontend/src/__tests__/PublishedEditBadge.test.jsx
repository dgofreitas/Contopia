// Contopia — PublishedEditBadge Component Tests (STORY-021)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublishedEditBadge from '../components/editor/PublishedEditBadge';

// setup.js mocks react-i18next; t returns key

describe('PublishedEditBadge', () => {
  it('renders badge when book status is published', () => {
    const book = { _id: 'b1', title: 'Published Book', status: 'published' };

    render(<PublishedEditBadge book={book} />);

    expect(screen.getByText('publishedEditBadge')).toBeInTheDocument();
    // Should have the badge styling elements
    const span = screen.getByText('publishedEditBadge');
    expect(span.className).toContain('rounded-full');
    expect(span.className).toContain('bg-amber-100');
    expect(span.className).toContain('text-amber-800');
  });

  it('renders nothing when book is null', () => {
    const { container } = render(<PublishedEditBadge book={null} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when book status is draft', () => {
    const book = { _id: 'b1', title: 'Draft', status: 'draft' };

    const { container } = render(<PublishedEditBadge book={book} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when book status is archived', () => {
    const book = { _id: 'b1', title: 'Archived', status: 'archived' };

    const { container } = render(<PublishedEditBadge book={book} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders an amber dot indicator inside the badge', () => {
    const book = { _id: 'b1', title: 'Published', status: 'published' };

    render(<PublishedEditBadge book={book} />);

    const dot = document.querySelector('.rounded-full.bg-amber-500');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });
});
