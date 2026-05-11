// Contopia — Auth Validation Schemas (Zod)
import { z } from 'zod';

/**
 * Register schema — parent email + child first name.
 * childFirstName allows Unicode letters (accented names common in pt-BR).
 */
export const registerSchema = z.object({
  parentEmail: z.string().email(),
  childFirstName: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}]+$/u, 'First name must contain only letters'),
});

/**
 * Resend verification schema — just the parent email.
 */
export const resendSchema = z.object({
  parentEmail: z.string().email(),
});

/**
 * Child login schema — childId + parentId.
 */
export const childLoginSchema = z.object({
  childId: z.string().min(1).regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  parentId: z.string().min(1).regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
});

/**
 * Login schema — discriminated union: password method or magic-link method.
 */
export const loginSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    childId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
    password: z.string().min(4).max(20),
  }),
  z.object({
    method: z.literal('magic-link'),
    parentEmail: z.string().email(),
    childFirstName: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[\p{L}]+$/u, 'First name must contain only letters'),
  }),
]);

/**
 * Logout schema — sessionId echoed for audit (actual sessionId from JWT).
 */
export const logoutSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * Refresh schema — refresh token string.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});