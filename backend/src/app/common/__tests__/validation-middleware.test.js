// Contopia — Validation Middleware Unit Tests (STORY-005)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validate } from '../validation-middleware.js';

describe('validation-middleware', () => {
  let req, res, next;

  const testSchema = z.object({
    title: z.string().min(1).max(200).trim(),
    age: z.number().int().min(0).optional(),
  });

  beforeEach(() => {
    req = { id: 'req-123', body: {}, query: {}, params: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('validate body source', () => {
    it('should call next when body is valid', () => {
      req.body = { title: 'My Book' };
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('should attach parsed body as req._body', () => {
      req.body = { title: 'My Book', age: 10 };
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      expect(req._body).toEqual({ title: 'My Book', age: 10 });
    });

    it('should strip unknown fields from parsed body', () => {
      req.body = { title: 'My Book', extraField: 'should be stripped' };
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      expect(req._body).toEqual({ title: 'My Book' });
      expect(req._body.extraField).toBeUndefined();
    });

    it('should return 400 when body is invalid', () => {
      req.body = { title: '' };
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledOnce();
    });

    it('should return child-friendly message for missing title', () => {
      req.body = {};
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.error.code).toBe('VALIDATION_ERROR');
      expect(jsonArg.error.message).toContain('Please give your book a title');
    });

    it('should include requestId in error meta', () => {
      req.body = { title: '' };
      const middleware = validate(testSchema, 'body');
      middleware(req, res, next);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.meta.requestId).toBe('req-123');
    });
  });

  describe('validate query source', () => {
    it('should call next when query is valid', () => {
      req.query = { page: '1' };
      const schema = z.object({ page: z.coerce.number().int().min(1) });
      const middleware = validate(schema, 'query');
      middleware(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('should attach parsed query as req._query', () => {
      req.query = { page: '2', pageSize: '10' };
      const schema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      });
      const middleware = validate(schema, 'query');
      middleware(req, res, next);
      expect(req._query.page).toBe(2);
      expect(req._query.pageSize).toBe(10);
    });

    it('should return 400 when query is invalid', () => {
      req.query = { page: 'abc' };
      const schema = z.object({ page: z.coerce.number().int().min(1) });
      const middleware = validate(schema, 'query');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validate params source', () => {
    it('should call next when params are valid', () => {
      req.params = { bookId: '507f1f77bcf86cd799439011' };
      const schema = z.object({ bookId: z.string().regex(/^[a-f\d]{24}$/i) });
      const middleware = validate(schema, 'params');
      middleware(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('should attach parsed params as req._params', () => {
      req.params = { bookId: '507f1f77bcf86cd799439011' };
      const schema = z.object({ bookId: z.string().regex(/^[a-f\d]{24}$/i) });
      const middleware = validate(schema, 'params');
      middleware(req, res, next);
      expect(req._params.bookId).toBe('507f1f77bcf86cd799439011');
    });

    it('should return 400 for invalid params', () => {
      req.params = { bookId: 'bad-id' };
      const schema = z.object({ bookId: z.string().regex(/^[a-f\d]{24}$/i) });
      const middleware = validate(schema, 'params');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.error.message).toContain("That doesn't look right");
    });
  });
});
