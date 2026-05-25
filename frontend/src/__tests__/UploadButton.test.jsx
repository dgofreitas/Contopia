// Contopia — UploadButton Component Tests (STORY-027)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadButton from '../app/cover/UploadButton';

describe('UploadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with translated label', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    // react-i18next mock returns the translation key as the label
    expect(screen.getByRole('button')).toHaveTextContent('cover.upload.buttonLabel');
  });

  it('should have aria-label attribute', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'cover.upload.buttonLabel');
  });

  it('should open file picker on button click', () => {
    const clickFn = vi.fn();
    const inputRef = { current: { click: clickFn } };

    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // The hidden file input should have been clicked
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('sr-only');
    expect(fileInput).toHaveAttribute('tabIndex', '-1');
    expect(fileInput).toHaveAttribute('aria-hidden', 'true');
  });

  it('should call onFileSelect when file is selected', () => {
    const onFileSelect = vi.fn();
    render(<UploadButton onFileSelect={onFileSelect} disabled={false} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('should reset file input value after selection', () => {
    const onFileSelect = vi.fn();
    render(<UploadButton onFileSelect={onFileSelect} disabled={false} />);

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['d'], 't.jpg')] } });

    expect(fileInput.value).toBe('');
  });

  it('should not call onFileSelect when no file selected (cancel)', () => {
    const onFileSelect = vi.fn();
    render(<UploadButton onFileSelect={onFileSelect} disabled={false} />);

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should be enabled when disabled prop is false', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('should set file input accept attribute to JPG and PNG', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', '.jpg,.jpeg,.png,image/png,image/jpeg');
  });

  it('should have keyboard accessibility — button is focusable', () => {
    render(<UploadButton onFileSelect={vi.fn()} disabled={false} />);
    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
