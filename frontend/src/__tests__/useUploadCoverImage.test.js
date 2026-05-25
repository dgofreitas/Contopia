// Contopia — useUploadCoverImage Hook Tests (STORY-027)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUploadCoverImage } from '../hooks/useUploadCoverImage';
import { useCoverStore } from '../stores/cover-store';

// Mock auth store
const mockToken = 'mock-auth-token';
vi.mock('../stores/auth-store', () => ({
  default: {
    getState: () => ({ token: mockToken }),
  },
  useAuthStore: {
    getState: () => ({ token: mockToken }),
  },
}));
vi.mock('../stores/auth-store.js', () => ({
  default: {
    getState: () => ({ token: mockToken }),
  },
  useAuthStore: {
    getState: () => ({ token: mockToken }),
  },
}));

// We need to manually mock the store to control state in tests
// but also use the real zustand store
import { create } from 'zustand';

describe('useUploadCoverImage', () => {
  let originalXHR;

  beforeEach(() => {
    // Reset the cover store
    useCoverStore.getState().resetStore();

    // Mock XMLHttpRequest
    originalXHR = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = vi.fn();
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXHR;
  });

  function createMockXHR() {
    const xhr = {
      upload: {
        addEventListener: vi.fn(),
      },
      addEventListener: vi.fn(),
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
      abort: vi.fn(),
      status: 201,
      responseText: JSON.stringify({
        data: {
          assetId: 'cover-asset-123',
          thumbnailUrl: 'https://s3.example.com/thumb.jpg',
          fullUrl: 'https://s3.example.com/full.jpg',
          dominantColor: '#4a9b6e',
        },
      }),
    };
    // Store event listeners for manual triggering
    xhr.upload.addEventListener.mockImplementation((event, handler) => {
      xhr[`_upload_${event}`] = handler;
    });
    xhr.addEventListener.mockImplementation((event, handler) => {
      xhr[`_${event}`] = handler;
    });
    globalThis.XMLHttpRequest.mockReturnValue(xhr);
    return xhr;
  }

  it('should upload image successfully and update store', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    let uploadPromise;
    act(() => {
      uploadPromise = result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    // Simulate upload progress
    act(() => {
      if (xhr._upload_progress) {
        xhr._upload_progress({ lengthComputable: true, loaded: 512, total: 1024 });
      }
    });

    expect(useCoverStore.getState().uploadProgress).toBe(50);

    // Simulate successful response
    act(() => {
      if (xhr._load) xhr._load();
    });

    const coverData = await uploadPromise;
    expect(coverData).toMatchObject({
      assetId: 'cover-asset-123',
      thumbnailUrl: expect.any(String),
      fullUrl: expect.any(String),
      dominantColor: '#4a9b6e',
    });

    const state = useCoverStore.getState();
    expect(state.coverImage).toMatchObject({
      assetId: 'cover-asset-123',
      dominantColor: '#4a9b6e',
    });
    expect(state.uploadProgress).toBe(100);
  });

  it('should set XHR Authorization header with bearer token', () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    act(() => {
      result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/v1/books/book123/assets?type=cover');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
  });

  it('should handle upload failure with server error message', async () => {
    const xhr = createMockXHR();
    xhr.status = 400;
    xhr.responseText = JSON.stringify({
      error: { code: 'INVALID_FILE_TYPE', message: 'Only photos allowed' },
    });

    const { result } = renderHook(() => useUploadCoverImage());

    let uploadPromise;
    act(() => {
      uploadPromise = result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await expect(uploadPromise).rejects.toThrow('Only photos allowed');
    expect(useCoverStore.getState().uploadError).toBe('UPLOAD_FAILED');
  });

  it('should handle network errors', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    let uploadPromise;
    act(() => {
      uploadPromise = result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      if (xhr._error) xhr._error();
    });

    await expect(uploadPromise).rejects.toThrow('Network error during upload');
    expect(useCoverStore.getState().uploadError).toBe('UPLOAD_FAILED');
  });

  it('should cancel upload and reset state', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    act(() => {
      result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      result.current.cancelUpload();
    });

    expect(xhr.abort).toHaveBeenCalled();
    expect(useCoverStore.getState().uploadProgress).toBe(0);
    expect(useCoverStore.getState().uploadError).toBeNull();
  });

  it('should handle response parse failure', async () => {
    const xhr = createMockXHR();
    xhr.status = 201;
    xhr.responseText = 'invalid-json{{{';

    const { result } = renderHook(() => useUploadCoverImage());

    let uploadPromise;
    act(() => {
      uploadPromise = result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await expect(uploadPromise).rejects.toThrow('Failed to parse upload response');
    expect(useCoverStore.getState().uploadError).toBe('PROCESSING_ERROR');
  });

  it('should handle upload without progress info (non-computable)', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    act(() => {
      result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      if (xhr._upload_progress) {
        xhr._upload_progress({ lengthComputable: false, loaded: 0, total: 0 });
      }
    });

    // Progress should not be updated when not computable
    expect(useCoverStore.getState().uploadProgress).toBe(0);
  });

  it('should handle abort event', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    let uploadPromise;
    act(() => {
      uploadPromise = result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    act(() => {
      if (xhr._abort) xhr._abort();
    });

    await expect(uploadPromise).rejects.toThrow('Upload cancelled');
    expect(result.current.isUploading).toBe(false);
  });

  it('should set isUploading to true during upload and false after', async () => {
    const xhr = createMockXHR();
    const { result } = renderHook(() => useUploadCoverImage());

    expect(result.current.isUploading).toBe(false);

    act(() => {
      result.current.uploadImage('book123', new File(['data'], 'test.jpg'));
    });

    expect(result.current.isUploading).toBe(true);

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });
});
