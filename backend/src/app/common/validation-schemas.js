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
  childId: z.string().min(1),
  parentId: z.string().min(1),
});