// Contopia — Error Codes Unit Tests (STORY-008)
import { describe, it, expect } from 'vitest';
import { ERROR_CODES, getErrorMessage } from '../error-codes.js';

describe('ERROR_CODES (STORY-008)', () => {
  it('should have all expected error codes', () => {
    const expectedCodes = [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'TOKEN_EXPIRED',
      'TOKEN_REVOKED',
      'FORBIDDEN',
      'NOT_FOUND',
      'RATE_LIMITED',
      'PAYLOAD_TOO_LARGE',
      'SESSION_EXPIRED',
      'SESSION_TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
    ];
    expectedCodes.forEach((code) => {
      expect(ERROR_CODES[code]).toBeDefined();
    });
  });

  it('should have exactly 14 error codes', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(14);
  });

  it('each code should have status and message object', () => {
    Object.entries(ERROR_CODES).forEach(([code, entry]) => {
      expect(entry).toHaveProperty('status');
      expect(typeof entry.status).toBe('number');
      expect(entry).toHaveProperty('message');
      expect(entry.message).toHaveProperty('pt');
      expect(entry.message).toHaveProperty('en');
      expect(typeof entry.message.pt).toBe('string');
      expect(typeof entry.message.en).toBe('string');
      expect(entry.message.pt.length).toBeGreaterThan(0);
      expect(entry.message.en.length).toBeGreaterThan(0);
    });
  });

  it('should have valid HTTP status codes (excluding 0 for NETWORK_ERROR/TIMEOUT_ERROR)', () => {
    const statuses = Object.values(ERROR_CODES)
      .filter((e) => e.status !== 0)
      .map((e) => e.status);
    statuses.forEach((status) => {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  it('should handle 0 status codes (NETWORK_ERROR, TIMEOUT_ERROR) for offline scenarios', () => {
    expect(ERROR_CODES.NETWORK_ERROR.status).toBe(0);
    expect(ERROR_CODES.TIMEOUT_ERROR.status).toBe(0);
  });
});

describe('getErrorMessage (STORY-008)', () => {
  describe('valid codes — English (default)', () => {
    it('should return English message for VALIDATION_ERROR', () => {
      expect(getErrorMessage('VALIDATION_ERROR')).toBe("That doesn't look right — please try again");
    });

    it('should return English message for UNAUTHORIZED', () => {
      expect(getErrorMessage('UNAUTHORIZED')).toBe('You need to sign in first');
    });

    it('should return English message for TOKEN_EXPIRED', () => {
      expect(getErrorMessage('TOKEN_EXPIRED')).toBe('Your session expired — please sign in again');
    });

    it('should return English message for TOKEN_REVOKED', () => {
      expect(getErrorMessage('TOKEN_REVOKED')).toBe('Your session was signed out — please sign in again');
    });

    it('should return English message for FORBIDDEN', () => {
      expect(getErrorMessage('FORBIDDEN')).toBe("You don't have permission to do that");
    });

    it('should return English message for NOT_FOUND', () => {
      expect(getErrorMessage('NOT_FOUND')).toBe("We couldn't find that — try going back");
    });

    it('should return English message for RATE_LIMITED', () => {
      expect(getErrorMessage('RATE_LIMITED')).toBe('Slow down — try again in a minute');
    });

    it('should return English message for PAYLOAD_TOO_LARGE', () => {
      expect(getErrorMessage('PAYLOAD_TOO_LARGE')).toBe('This file is too big! Try a smaller picture.');
    });

    it('should return English message for SESSION_EXPIRED', () => {
      expect(getErrorMessage('SESSION_EXPIRED')).toBe('Your session has expired');
    });

    it('should return English message for SESSION_TIMEOUT', () => {
      expect(getErrorMessage('SESSION_TIMEOUT')).toBe('Your session is about to expire due to inactivity');
    });

    it('should return English message for SERVICE_UNAVAILABLE', () => {
      expect(getErrorMessage('SERVICE_UNAVAILABLE')).toBe("Something's not working right now — try again soon");
    });

    it('should return English message for INTERNAL_ERROR', () => {
      expect(getErrorMessage('INTERNAL_ERROR')).toBe('Something went wrong — please try again later');
    });

    it('should return English message for NETWORK_ERROR', () => {
      expect(getErrorMessage('NETWORK_ERROR')).toBe('No internet — your work is safe! Try again.');
    });

    it('should return English message for TIMEOUT_ERROR', () => {
      expect(getErrorMessage('TIMEOUT_ERROR')).toBe("It's taking too long to respond — try again.");
    });
  });

  describe('valid codes — Portuguese', () => {
    it('should return Portuguese message for VALIDATION_ERROR', () => {
      expect(getErrorMessage('VALIDATION_ERROR', 'pt')).toBe('Algo não está certo — tente novamente');
    });

    it('should return Portuguese message for UNAUTHORIZED', () => {
      expect(getErrorMessage('UNAUTHORIZED', 'pt')).toBe('Você precisa entrar primeiro');
    });

    it('should return Portuguese message for TOKEN_EXPIRED', () => {
      expect(getErrorMessage('TOKEN_EXPIRED', 'pt')).toBe('Sua sessão expirou — entre novamente');
    });

    it('should return Portuguese message for TOKEN_REVOKED', () => {
      expect(getErrorMessage('TOKEN_REVOKED', 'pt')).toBe('Sua sessão foi encerrada — entre novamente');
    });

    it('should return Portuguese message for FORBIDDEN', () => {
      expect(getErrorMessage('FORBIDDEN', 'pt')).toBe('Você não tem permissão para fazer isso');
    });

    it('should return Portuguese message for NOT_FOUND', () => {
      expect(getErrorMessage('NOT_FOUND', 'pt')).toBe('Não conseguimos encontrar isso — tente voltar');
    });

    it('should return Portuguese message for RATE_LIMITED', () => {
      expect(getErrorMessage('RATE_LIMITED', 'pt')).toBe('Devagar — tente novamente em um minuto');
    });

    it('should return Portuguese message for PAYLOAD_TOO_LARGE', () => {
      expect(getErrorMessage('PAYLOAD_TOO_LARGE', 'pt')).toBe('Esse arquivo é grande demais! Tente uma imagem menor.');
    });

    it('should return Portuguese message for INTERNAL_ERROR', () => {
      expect(getErrorMessage('INTERNAL_ERROR', 'pt')).toBe('Algo deu errado — tente novamente mais tarde');
    });
  });

  describe('fallback behavior', () => {
    it('should default to English when lang is not provided', () => {
      expect(getErrorMessage('NOT_FOUND')).toBe("We couldn't find that — try going back");
    });

    it('should fall back to English when unsupported language is provided', () => {
      expect(getErrorMessage('NOT_FOUND', 'fr')).toBe("We couldn't find that — try going back");
    });

    it('should fall back to English when lang is null', () => {
      expect(getErrorMessage('NOT_FOUND', null)).toBe("We couldn't find that — try going back");
    });

    it('should fall back to English when lang is undefined', () => {
      expect(getErrorMessage('NOT_FOUND', undefined)).toBe("We couldn't find that — try going back");
    });

    it('should return INTERNAL_ERROR message for unknown error code', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe('Something went wrong — please try again later');
    });

    it('should return pt INTERNAL_ERROR message for unknown code with pt lang', () => {
      expect(getErrorMessage('UNKNOWN_CODE', 'pt')).toBe('Algo deu errado — tente novamente mais tarde');
    });
  });
});
