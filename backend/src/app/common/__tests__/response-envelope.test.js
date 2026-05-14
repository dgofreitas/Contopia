// Contopia — Response Envelope Unit Tests (STORY-005)
import { describe, it, expect } from 'vitest';
import { ok, paginated, fail } from '../response-envelope.js';

describe('response-envelope', () => {
  describe('ok', () => {
    it('should wrap data with meta', () => {
      const result = ok({ id: '123' });
      expect(result).toEqual({ data: { id: '123' }, meta: {} });
    });

    it('should include custom meta when provided', () => {
      const result = ok({ id: '123' }, { requestId: 'req-1' });
      expect(result.meta.requestId).toBe('req-1');
    });

    it('should handle null data', () => {
      const result = ok(null);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = ok(items);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('paginated', () => {
    it('should wrap data with pagination meta', () => {
      const items = [{ id: 1 }];
      const result = paginated(items, { total: 1, page: 1, pageSize: 20, totalPages: 1 });
      expect(result.data).toEqual(items);
      expect(result.meta.pagination.total).toBe(1);
      expect(result.meta.pagination.page).toBe(1);
      expect(result.meta.pagination.pageSize).toBe(20);
      expect(result.meta.pagination.totalPages).toBe(1);
    });

    it('should handle empty array', () => {
      const result = paginated([], { total: 0, page: 1, pageSize: 20, totalPages: 0 });
      expect(result.data).toEqual([]);
    });
  });

  describe('fail', () => {
    it('should wrap error with code and message', () => {
      const result = fail('VALIDATION_ERROR', 'Bad input');
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Bad input');
    });

    it('should include meta when provided', () => {
      const result = fail('NOT_FOUND', 'Not found', { requestId: 'req-1' });
      expect(result.meta.requestId).toBe('req-1');
    });

    it('should default meta to empty object', () => {
      const result = fail('INTERNAL_ERROR', 'Something went wrong');
      expect(result.meta).toEqual({});
    });
  });
});
