// Contopia — GDPR Cleanup Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../auth/auth-model.js', () => {
  return { Child: { find: vi.fn() } };
});

vi.mock('../../auth/auth-dao.js', () => ({
  softDeleteChildById: vi.fn(),
  hardDeleteChildById: vi.fn(),
}));

vi.mock('../../storage/storage-manager.js', () => ({
  purgeAssetsByAuthorManager: vi.fn(),
}));

vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { cleanupExpiredAccounts, scheduleGdrpCleanup } from '../gdpr-cleanup.js';
import { Child } from '../../auth/auth-model.js';
import { hardDeleteChildById } from '../../auth/auth-dao.js';
import { purgeAssetsByAuthorManager } from '../../storage/storage-manager.js';

describe('GDPR Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanupExpiredAccounts', () => {
    it('should find expired children, purge assets, and hard-delete', async () => {
      const expiredChildren = [
        { _id: 'c1', firstName: 'João' },
        { _id: 'c2', firstName: 'Maria' },
      ];
      // Mock: Child.find(...).limit(...).lean() returns the array
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(expiredChildren) }) });
      purgeAssetsByAuthorManager.mockResolvedValue(undefined);
      hardDeleteChildById.mockResolvedValue({ _id: 'c1' });

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      expect(purgeAssetsByAuthorManager).toHaveBeenCalledWith('c1');
      expect(purgeAssetsByAuthorManager).toHaveBeenCalledWith('c2');
      expect(hardDeleteChildById).toHaveBeenCalledWith('c1');
      expect(hardDeleteChildById).toHaveBeenCalledWith('c2');
    });

    it('should return processed:0 when no expired children exist', async () => {
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(purgeAssetsByAuthorManager).not.toHaveBeenCalled();
    });

    it('should continue processing even if purge fails for one child', async () => {
      const expiredChildren = [
        { _id: 'c1', firstName: 'João' },
        { _id: 'c2', firstName: 'Maria' },
      ];
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(expiredChildren) }) });
      purgeAssetsByAuthorManager
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockResolvedValueOnce(undefined);
      hardDeleteChildById
        .mockRejectedValueOnce(new Error('DB error')) // c1 purge fails, hard-delete also fails
        .mockResolvedValueOnce({ _id: 'c2' }); // c2 succeeds

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('scheduleGdrpCleanup', () => {
    it('should call cleanup immediately and return an interval object', async () => {
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });

      const interval = scheduleGdrpCleanup(60 * 1000);

      // Let the immediate call run
      await new Promise((r) => setTimeout(r, 10));

      expect(typeof interval).toBe('object');
      clearInterval(interval);
    });
  });
});