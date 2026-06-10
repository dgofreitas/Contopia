import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import useParentDashboard from '../hooks/useParentDashboard';

vi.mock('../stores/parent-auth-store', () => {
  const state = { parentToken: 'parent-jwt' };
  const storeFn = (selector) => selector ? selector(state) : state;
  storeFn.getState = () => state;
  return { default: storeFn };
});

vi.mock('../lib/parent-api-client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import parentApiClient from '../lib/parent-api-client';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard data on successful fetch', async () => {
    const mockData = {
      data: {
        email: 'parent@test.com',
        children: [
          { childId: 'c1', firstName: 'Julia', createdAt: '2025-01-15T10:00:00Z' },
        ],
      },
    };
    parentApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useParentDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(parentApiClient.get).toHaveBeenCalledWith('/dashboard');
  });

  it('calls GET /dashboard with parent token enabled', async () => {
    parentApiClient.get.mockResolvedValueOnce({ data: { data: { email: 'p@t.com', children: [] } } });

    const { result } = renderHook(() => useParentDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(parentApiClient.get).toHaveBeenCalledWith('/dashboard');
  });

  it('handles fetch errors', async () => {
    parentApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useParentDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});