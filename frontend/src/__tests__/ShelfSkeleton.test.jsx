import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ShelfSkeleton from '../components/shelf/ShelfSkeleton';

// setup.js already mocks react-i18next to pass through keys

describe('ShelfSkeleton', () => {
  it('has aria-busy=true', () => {
    const { container } = render(<ShelfSkeleton />);
    const section = container.querySelector('[aria-busy="true"]');
    expect(section).toBeInTheDocument();
  });

  it('has aria-label from i18n', () => {
    const { container } = render(<ShelfSkeleton />);
    // setup.js mock returns key as value
    const section = container.querySelector('[aria-label="loading"]');
    expect(section).toBeInTheDocument();
  });

  it('renders skeleton placeholder divs with animate-pulse', () => {
    const { container } = render(<ShelfSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(15);
  });

  it('renders 3 wood shelf bars', () => {
    const { container } = render(<ShelfSkeleton />);
    const woodBars = container.querySelectorAll('.rounded-b-sm');
    expect(woodBars.length).toBe(3);
  });
});
