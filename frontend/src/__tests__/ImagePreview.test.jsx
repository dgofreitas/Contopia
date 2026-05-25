// Contopia — ImagePreview Component Tests (STORY-027)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImagePreview from '../app/cover/ImagePreview';

describe('ImagePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render thumbnail image with correct src', () => {
    render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://s3.example.com/thumb.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render with fullUrl when thumbnailUrl is not provided', () => {
    render(
      <ImagePreview
        thumbnailUrl={null}
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://s3.example.com/full.jpg');
  });

  it('should show loading placeholder when image is not loaded', () => {
    const { container } = render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    // Loading skeleton should be present
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should hide loading placeholder after image loads', () => {
    const { container } = render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.load(img);

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeInTheDocument();
    expect(img.className).toContain('block');
  });

  it('should show error state when image fails to load', () => {
    render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/broken.jpg"
        fullUrl="https://s3.example.com/broken.jpg"
        onRemove={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    // Error state: shows a placeholder with remove button
    expect(screen.getByText('?')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button');
    expect(removeBtn).toHaveTextContent('cover.upload.removeButton');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should render remove button with correct aria-label', () => {
    render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    const removeBtn = buttons.find(b => b.getAttribute('aria-label') === 'cover.upload.removeButton');
    expect(removeBtn).toBeInTheDocument();
  });

  it('should call onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={onRemove}
      />
    );

    const buttons = screen.getAllByRole('button');
    const removeBtn = buttons.find(b => b.getAttribute('aria-label') === 'cover.upload.removeButton');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should render alt text on image', () => {
    render(
      <ImagePreview
        thumbnailUrl="https://s3.example.com/thumb.jpg"
        fullUrl="https://s3.example.com/full.jpg"
        onRemove={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'cover.upload.previewAlt');
  });
});
