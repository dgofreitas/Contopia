import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useImportBook from '../hooks/useImportBook';

vi.mock('../lib/api-client', () => ({
  default: { post: vi.fn() },
}));

const mockToken = 'mock-auth-token';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function createMockXHR() {
  const xhr = {
    upload: { addEventListener: vi.fn() },
    addEventListener: vi.fn(),
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    status: 201,
    responseText: JSON.stringify({ data: { _id: 'book1', title: 'test' } }),
  };

  xhr.upload.addEventListener.mockImplementation((event, handler) => {
    xhr[`_upload_${event}`] = handler;
  });
  xhr.addEventListener.mockImplementation((event, handler) => {
    xhr[`_${event}`] = handler;
  });

  return xhr;
}

describe('useImportBook', () => {
  let originalXHR;

  beforeEach(() => {
    originalXHR = globalThis.XMLHttpRequest;
    localStorage.setItem('token', mockToken);
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXHR;
    vi.restoreAllMocks();
  });

  it('successful import calls API and invalidates books cache', async () => {
    const xhr = createMockXHR();
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useImportBook('txt'), { wrapper });

    await act(async () => {
      result.current.mutateAsync({ file: new File(['hello'], 'test.txt', { type: 'text/plain' }) }).catch(() => {});
    });

    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/v1/import/txt');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
    expect(xhr.send).toHaveBeenCalled();

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['books'] });
    });
  });

  it('tracks upload progress from 0 to 100', async () => {
    const xhr = createMockXHR();
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    expect(result.current.progress).toBe(0);

    act(() => {
      result.current.mutate({ file: new File(['hello'], 'test.txt', { type: 'text/plain' }) });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._upload_progress) {
        xhr._upload_progress({ lengthComputable: true, loaded: 50, total: 100 });
      }
    });

    expect(result.current.progress).toBe(50);

    act(() => {
      if (xhr._upload_progress) {
        xhr._upload_progress({ lengthComputable: true, loaded: 100, total: 100 });
      }
    });

    expect(result.current.progress).toBe(100);

    act(() => {
      if (xhr._load) xhr._load();
    });
  });

  it('handles server error with INVALID_FILE_TYPE code', async () => {
    const xhr = createMockXHR();
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: { code: 'INVALID_FILE_TYPE', message: 'Wrong type' } });
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ file: new File(['x'], 'bad.docx') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('INVALID_FILE_TYPE');
    });
  });

  it('handles network failure with UPLOAD_FAILED error', async () => {
    const xhr = createMockXHR();
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ file: new File(['x'], 'test.txt') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._error) xhr._error();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('UPLOAD_FAILED');
    });
  });

  it('reset clears progress and error state', async () => {
    const xhr = createMockXHR();
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: { code: 'UPLOAD_FAILED', message: 'fail' } });
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ file: new File(['x'], 'test.txt') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._upload_progress) {
        xhr._upload_progress({ lengthComputable: true, loaded: 50, total: 100 });
      }
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('handles unparseable error response as UPLOAD_FAILED', async () => {
    const xhr = createMockXHR();
    xhr.status = 400;
    xhr.responseText = 'not-json{{{';
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ file: new File(['x'], 'test.txt') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('UPLOAD_FAILED');
    });
  });

  it('handles PAYLOAD_TOO_LARGE error code from server', async () => {
    const xhr = createMockXHR();
    xhr.status = 413;
    xhr.responseText = JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Too big' } });
    globalThis.XMLHttpRequest = vi.fn(() => xhr);

    const { result } = renderHook(() => useImportBook('txt'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ file: new File(['x'], 'big.txt') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      if (xhr._load) xhr._load();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});