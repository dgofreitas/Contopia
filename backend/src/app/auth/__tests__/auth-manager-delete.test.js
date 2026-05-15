// Contopia — Auth Manager: deleteAccountManager Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal();
  const mockHash = {
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash-value'),
  };
  return {
    ...actual,
    default: { ...actual.default, createHash: vi.fn().mockReturnValue(mockHash) },
    createHash: vi.fn().mockReturnValue(mockHash),
  };
});

vi.mock('jsonwebtoken');
vi.mock('../auth-dao.js', () => ({
  findParentByEmail: vi.fn(),
  findParentByVerificationTokenHash: vi.fn(),
  createParent: vi.fn(),
  updateParentVerification: vi.fn(),
  markParentVerified: vi.fn(),
  clearParentVerificationToken: vi.fn(),
  findChildById: vi.fn(),
  findActiveChildByParentAndName: vi.fn(),
  findPendingChildByParentAndName: vi.fn(),
  createChild: vi.fn(),
  activateChild: vi.fn(),
  findPendingChildByParent: vi.fn(),
  findChildByIdWithPassword: vi.fn(),
  updateChildPassword: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  softDeleteChildById: vi.fn(),
  hardDeleteChildById: vi.fn(),
}));
vi.mock('../../storage/storage-manager.js', () => ({
  purgeAssetsByAuthorManager: vi.fn(),
}));
vi.mock('../../../config/redis.js');
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import * as storageManager from '../../storage/storage-manager.js';

describe('deleteAccountManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete child and purge assets successfully', async () => {
    const child = { _id: 'c1', parentId: 'p1', firstName: 'João' };
    authDao.findChildById.mockResolvedValue(child);
    storageManager.purgeAssetsByAuthorManager.mockResolvedValue(undefined);
    authDao.softDeleteChildById.mockResolvedValue({ ...child, deletedAt: new Date() });

    const result = await authManager.deleteAccountManager({ childId: 'c1' });

    expect(result).toEqual({ deleted: true, childId: 'c1' });
    expect(authDao.findChildById).toHaveBeenCalledWith('c1');
    expect(storageManager.purgeAssetsByAuthorManager).toHaveBeenCalledWith('c1');
    expect(authDao.softDeleteChildById).toHaveBeenCalledWith('c1');
  });

  it('should continue with soft-delete even if asset purge fails', async () => {
    const child = { _id: 'c1', parentId: 'p1', firstName: 'João' };
    authDao.findChildById.mockResolvedValue(child);
    storageManager.purgeAssetsByAuthorManager.mockRejectedValue(new Error('S3 error'));
    authDao.softDeleteChildById.mockResolvedValue({ ...child, deletedAt: new Date() });

    const result = await authManager.deleteAccountManager({ childId: 'c1' });

    expect(result).toEqual({ deleted: true, childId: 'c1' });
    expect(storageManager.purgeAssetsByAuthorManager).toHaveBeenCalledWith('c1');
    expect(authDao.softDeleteChildById).toHaveBeenCalledWith('c1');
  });

  it('should throw NOT_FOUND 404 when child not found', async () => {
    authDao.findChildById.mockResolvedValue(null);

    await expect(authManager.deleteAccountManager({ childId: 'nonexistent' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});