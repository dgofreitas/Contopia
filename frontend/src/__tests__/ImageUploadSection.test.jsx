// Contopia — ImageUploadSection Integration Tests (STORY-027)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploadSection from '../app/cover/ImageUploadSection';
import { useCoverStore } from '../stores/cover-store';

// Mock the upload hook
vi.mock('../hooks/useUploadCoverImage', () => ({
  useUploadCoverImage: vi.fn(),
}));

import { useUploadCoverImage } from '../hooks/useUploadCoverImage';

describe('ImageUploadSection', () => {
  const mockUploadImage = vi.fn();
  const mockCancelUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCoverStore.getState().resetStore();

    useUploadCoverImage.mockReturnValue({
      uploadImage: mockUploadImage,
      cancelUpload: mockCancelUpload,
      isUploading: false,
    });
  });

  it('should render section heading', () => {
    render(<ImageUploadSection bookId="book123" />);
    expect(screen.getByText('cover.upload.sectionHeading')).toBeInTheDocument();
  });

  it('should render UploadButton', () => {
    render(<ImageUploadSection bookId="book123" />);
    expect(screen.getByRole('button', { name: 'cover.upload.buttonLabel' })).toBeInTheDocument();
  });

  it('should validate file before upload and reject invalid types', async () => {
    render(<ImageUploadSection bookId="book123" />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['<svg/>'], 'test.svg', { type: 'image/svg+xml' });
    Object.defineProperty(file, 'size', { value: 100 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // SVG should be rejected — upload should not be called
    await waitFor(() => {
      expect(mockUploadImage).not.toHaveBeenCalled();
      expect(useCoverStore.getState().uploadError).toBe('SVG_NOT_ALLOWED');
    });
  });

  it('should validate file and call uploadImage for valid files', async () => {
    mockUploadImage.mockResolvedValue({ assetId: 'test' });
    render(<ImageUploadSection bookId="book123" />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith('book123', file);
    });
  });

  it('should show error message when upload error is set', () => {
    useCoverStore.getState().setUploadError('FILE_TOO_LARGE');
    render(<ImageUploadSection bookId="book123" />);

    expect(screen.getByText('cover.upload.errors.FILE_TOO_LARGE')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should not show error when upload is in progress', () => {
    useUploadCoverImage.mockReturnValue({
      uploadImage: mockUploadImage,
      cancelUpload: mockCancelUpload,
      isUploading: true,
    });
    useCoverStore.getState().setUploadError('FILE_TOO_LARGE');
    useCoverStore.setState({ isUploading: true, uploadProgress: 50 });

    render(<ImageUploadSection bookId="book123" />);

    // Error should not be visible during upload
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show UploadProgress when uploading', () => {
    useUploadCoverImage.mockReturnValue({
      uploadImage: mockUploadImage,
      cancelUpload: mockCancelUpload,
      isUploading: true,
    });
    useCoverStore.setState({ isUploading: true, uploadProgress: 50 });

    render(<ImageUploadSection bookId="book123" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show ImagePreview when coverImage exists', () => {
    useCoverStore.getState().setCoverImage({
      assetId: 'cover-123',
      thumbnailUrl: 'https://s3.example.com/thumb.jpg',
      fullUrl: 'https://s3.example.com/full.jpg',
      dominantColor: '#4a9b6e',
    });

    render(<ImageUploadSection bookId="book123" />);

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://s3.example.com/thumb.jpg');
  });

  it('should clear cover image via ImagePreview remove button', () => {
    useCoverStore.getState().setCoverImage({
      assetId: 'cover-123',
      thumbnailUrl: 'https://s3.example.com/thumb.jpg',
      fullUrl: 'https://s3.example.com/full.jpg',
    });

    render(<ImageUploadSection bookId="book123" />);

    const removeButtons = screen.getAllByRole('button');
    const removeBtn = removeButtons.find(b => b.getAttribute('aria-label') === 'cover.upload.removeButton');
    fireEvent.click(removeBtn);

    expect(useCoverStore.getState().coverImage).toBeNull();
  });

  it('should handle upload errors thrown in uploadImage', async () => {
    mockUploadImage.mockRejectedValue(new Error('Upload failed'));
    render(<ImageUploadSection bookId="book123" />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should not throw — error handled by hook
    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalled();
    });
  });

  it('should show UploadProgress with cancel button during upload', () => {
    useUploadCoverImage.mockReturnValue({
      uploadImage: mockUploadImage,
      cancelUpload: mockCancelUpload,
      isUploading: true,
    });
    useCoverStore.setState({ isUploading: true, uploadProgress: 50 });

    render(<ImageUploadSection bookId="book123" />);

    expect(screen.getByText('cover.upload.cancel')).toBeInTheDocument();
  });

  it('should call cancelUpload when cancel button clicked', () => {
    useUploadCoverImage.mockReturnValue({
      uploadImage: mockUploadImage,
      cancelUpload: mockCancelUpload,
      isUploading: true,
    });
    useCoverStore.setState({ isUploading: true, uploadProgress: 50 });

    render(<ImageUploadSection bookId="book123" />);

    fireEvent.click(screen.getByText('cover.upload.cancel'));
    expect(mockCancelUpload).toHaveBeenCalled();
  });
});
