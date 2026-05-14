// Contopia — Auth DAO Tests (co-located)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Parent, Child } from '../auth-model.js';
import * as authDao from '../auth-dao.js';

vi.mock('../auth-model.js');

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper: build a mongoose query chain that returns .lean().exec() chain
function leanExecChain(value) {
  const exec = vi.fn().mockResolvedValue(value);
  const lean = vi.fn().mockReturnValue({ exec });
  return { exec, lean };
}

// Helper: build a chain with .select().lean().exec()
function selectLeanExecChain(value) {
  const exec = vi.fn().mockResolvedValue(value);
  const lean = vi.fn().mockReturnValue({ exec });
  const select = vi.fn().mockReturnValue({ lean, exec });
  return { exec, lean, select };
}

describe('Auth DAO', () => {
  // ── findParentByEmail ──────────────────────────────────────────────────────
  describe('findParentByEmail', () => {
    it('should find parent by lowercased email (found)', async () => {
      const mock = { _id: 'parent123', email: 'test@example.com' };
      Parent.findOne.mockReturnValue(leanExecChain(mock));

      const result = await authDao.findParentByEmail('Test@Example.com');
      expect(result).toEqual(mock);
      expect(Parent.findOne).toHaveBeenCalledWith({ email: 'Test@Example.com' });
    });

    it('should return null when parent not found', async () => {
      Parent.findOne.mockReturnValue(leanExecChain(null));

      const result = await authDao.findParentByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  // ── findParentByVerificationTokenHash ──────────────────────────────────────
  describe('findParentByVerificationTokenHash', () => {
    it('should find parent by token hash with hidden fields selected', async () => {
      const mock = { _id: 'parent123', verificationToken: 'hash', verificationTokenExpires: new Date() };
      Parent.findOne.mockReturnValue(selectLeanExecChain(mock));

      const result = await authDao.findParentByVerificationTokenHash('hash');
      expect(result).toEqual(mock);
      expect(Parent.findOne).toHaveBeenCalledWith({ verificationToken: 'hash' });
    });

    it('should return null when token hash not found', async () => {
      Parent.findOne.mockReturnValue(selectLeanExecChain(null));
      const result = await authDao.findParentByVerificationTokenHash('nope');
      expect(result).toBeNull();
    });
  });

  // ── createParent ───────────────────────────────────────────────────────────
  describe('createParent', () => {
    it('should create parent and call toObject()', async () => {
      const mock = { _id: 'p1', email: 'new@ex.com', toObject: vi.fn().mockReturnValue({ _id: 'p1', email: 'new@ex.com' }) };
      Parent.create.mockResolvedValue(mock);

      const result = await authDao.createParent({ email: 'new@ex.com' });
      expect(result).toEqual({ _id: 'p1', email: 'new@ex.com' });
      expect(Parent.create).toHaveBeenCalledWith({ email: 'new@ex.com' });
    });
  });

  // ── updateParentVerification ───────────────────────────────────────────────
  describe('updateParentVerification', () => {
    it('should update verification token + expiry', async () => {
      const mock = { _id: 'p1', verificationToken: 'h', verificationTokenExpires: new Date('2025-01-01') };
      const expires = new Date('2025-01-01');
      Parent.findByIdAndUpdate.mockReturnValue(selectLeanExecChain(mock));

      const result = await authDao.updateParentVerification('p1', {
        verificationToken: 'h',
        verificationTokenExpires: expires,
      });
      expect(result).toEqual(mock);
      expect(Parent.findByIdAndUpdate).toHaveBeenCalledWith('p1',
        { verificationToken: 'h', verificationTokenExpires: expires },
        { new: true }
      );
    });
  });

  // ── markParentVerified ─────────────────────────────────────────────────────
  describe('markParentVerified', () => {
    it('should set isVerified to true', async () => {
      const mock = { _id: 'p1', isVerified: true };
      Parent.findByIdAndUpdate.mockReturnValue(leanExecChain(mock));

      const result = await authDao.markParentVerified('p1');
      expect(result).toEqual(mock);
      expect(Parent.findByIdAndUpdate).toHaveBeenCalledWith('p1', { isVerified: true }, { new: true });
    });
  });

  // ── clearParentVerificationToken ───────────────────────────────────────────
  describe('clearParentVerificationToken', () => {
    it('should $unset verification token fields', async () => {
      const mock = { _id: 'p1' };
      Parent.findByIdAndUpdate.mockReturnValue(leanExecChain(mock));

      const result = await authDao.clearParentVerificationToken('p1');
      expect(result).toEqual(mock);
      expect(Parent.findByIdAndUpdate).toHaveBeenCalledWith('p1',
        { $unset: { verificationToken: '', verificationTokenExpires: '' } },
        { new: true }
      );
    });
  });

  // ── findChildById ──────────────────────────────────────────────────────────
  describe('findChildById', () => {
    it('should find child by ID (found)', async () => {
      const mock = { _id: 'c1', parentId: 'p1', firstName: 'A' };
      Child.findById.mockReturnValue(leanExecChain(mock));

      const result = await authDao.findChildById('c1');
      expect(result).toEqual(mock);
      expect(Child.findById).toHaveBeenCalledWith('c1');
    });

    it('should return null when child not found', async () => {
      Child.findById.mockReturnValue(leanExecChain(null));
      const result = await authDao.findChildById('xxx');
      expect(result).toBeNull();
    });
  });

  // ── findActiveChildByParentAndName ─────────────────────────────────────────
  describe('findActiveChildByParentAndName', () => {
    it('should find active child by parent + name (found)', async () => {
      const mock = { _id: 'c1', parentId: 'p1', firstName: 'A', isActive: true };
      Child.findOne.mockReturnValue(leanExecChain(mock));

      const result = await authDao.findActiveChildByParentAndName('p1', 'A');
      expect(result).toEqual(mock);
      expect(Child.findOne).toHaveBeenCalledWith({ parentId: 'p1', firstName: 'A', isActive: true });
    });

    it('should return null when no active child found', async () => {
      Child.findOne.mockReturnValue(leanExecChain(null));
      const result = await authDao.findActiveChildByParentAndName('p1', 'Z');
      expect(result).toBeNull();
    });
  });

  // ── createChild ────────────────────────────────────────────────────────────
  describe('createChild', () => {
    it('should create child and call toObject()', async () => {
      const raw = { _id: 'c1', parentId: 'p1', firstName: 'A' };
      const mock = { ...raw, toObject: vi.fn().mockReturnValue(raw) };
      Child.create.mockResolvedValue(mock);

      const result = await authDao.createChild({ parentId: 'p1', firstName: 'A' });
      expect(result).toEqual(raw);
      expect(Child.create).toHaveBeenCalledWith({ parentId: 'p1', firstName: 'A' });
    });
  });

  // ── activateChild ──────────────────────────────────────────────────────────
  describe('activateChild', () => {
    it('should set isActive to true', async () => {
      const mock = { _id: 'c1', isActive: true };
      Child.findByIdAndUpdate.mockReturnValue(leanExecChain(mock));

      const result = await authDao.activateChild('c1');
      expect(result).toEqual(mock);
      expect(Child.findByIdAndUpdate).toHaveBeenCalledWith('c1', { isActive: true }, { new: true });
    });
  });

  // ── softDeleteChildById ───────────────────────────────────────────────────
  describe('softDeleteChildById', () => {
    it('should set deletedAt on the child', async () => {
      const now = new Date();
      const mock = { _id: 'c1', firstName: 'A', deletedAt: now };
      Child.findByIdAndUpdate.mockReturnValue(leanExecChain(mock));

      const result = await authDao.softDeleteChildById('c1');
      expect(result).toEqual(mock);
      expect(Child.findByIdAndUpdate).toHaveBeenCalledWith('c1', { deletedAt: expect.any(Date) }, { new: true });
    });

    it('should return null when child not found', async () => {
      Child.findByIdAndUpdate.mockReturnValue(leanExecChain(null));
      const result = await authDao.softDeleteChildById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── hardDeleteChildById ───────────────────────────────────────────────────
  describe('hardDeleteChildById', () => {
    it('should delete the child document', async () => {
      const mock = { _id: 'c1', firstName: 'A' };
      const lean = vi.fn().mockResolvedValue(mock);
      Child.findByIdAndDelete.mockReturnValue({ lean });

      const result = await authDao.hardDeleteChildById('c1');
      expect(result).toEqual(mock);
      expect(Child.findByIdAndDelete).toHaveBeenCalledWith('c1');
    });

    it('should return null when child not found', async () => {
      const lean = vi.fn().mockResolvedValue(null);
      Child.findByIdAndDelete.mockReturnValue({ lean });

      const result = await authDao.hardDeleteChildById('nonexistent');
      expect(result).toBeNull();
    });
  });
});
