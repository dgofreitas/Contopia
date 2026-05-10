// Contopia — Auth DAO Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Parent, Child } from '../app/auth/auth-model.js';
import * as authDao from '../app/auth/auth-dao.js';

vi.mock('../app/auth/auth-model.js');

// Helper: mongoose chain .lean().exec()
function leanExec(val) {
  const exec = vi.fn().mockResolvedValue(val);
  const lean = vi.fn().mockReturnValue({ exec });
  return { lean, exec };
}

// Helper: mongoose chain .select().lean().exec()
function selectLeanExec(val) {
  const exec = vi.fn().mockResolvedValue(val);
  const lean = vi.fn().mockReturnValue({ exec });
  const select = vi.fn().mockReturnValue({ lean, exec });
  return { select, lean, exec };
}

describe('Auth DAO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findParentByEmail', () => {
    it('should find parent by email (found)', async () => {
      const mock = { _id: 'parent123', email: 'test@example.com' };
      Parent.findOne.mockReturnValue(leanExec(mock));

      const result = await authDao.findParentByEmail('test@example.com');
      expect(result).toEqual(mock);
      expect(Parent.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null when parent not found', async () => {
      Parent.findOne.mockReturnValue(leanExec(null));
      const result = await authDao.findParentByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findParentByVerificationTokenHash', () => {
    it('should find parent by token hash with select fields', async () => {
      const mock = {
        _id: 'parent123',
        verificationToken: 'hashed-token',
        verificationTokenExpires: new Date(),
      };
      Parent.findOne.mockReturnValue(selectLeanExec(mock));

      const result = await authDao.findParentByVerificationTokenHash('hashed-token');
      expect(result).toEqual(mock);
      expect(Parent.findOne).toHaveBeenCalledWith({ verificationToken: 'hashed-token' });
    });
  });

  describe('createParent', () => {
    it('should create and return new parent', async () => {
      const raw = { _id: 'parent123', email: 'new@example.com' };
      const doc = { ...raw, toObject: () => raw };
      Parent.create.mockResolvedValue(doc);

      const result = await authDao.createParent({ email: 'new@example.com' });
      expect(result).toEqual(raw);
      expect(Parent.create).toHaveBeenCalledWith({ email: 'new@example.com' });
    });
  });

  describe('updateParentVerification', () => {
    it('should update verification token and expiry', async () => {
      const mock = { _id: 'parent123', verificationToken: 'new-hash', verificationTokenExpires: new Date() };
      const expires = new Date();
      Parent.findByIdAndUpdate.mockReturnValue(selectLeanExec(mock));

      const result = await authDao.updateParentVerification('parent123', {
        verificationToken: 'new-hash',
        verificationTokenExpires: expires,
      });
      expect(result).toEqual(mock);
    });
  });

  describe('markParentVerified', () => {
    it('should mark parent as verified', async () => {
      const mock = { _id: 'parent123', isVerified: true };
      Parent.findByIdAndUpdate.mockReturnValue(leanExec(mock));

      const result = await authDao.markParentVerified('parent123');
      expect(result).toEqual(mock);
      expect(Parent.findByIdAndUpdate).toHaveBeenCalledWith('parent123', { isVerified: true }, { new: true });
    });
  });

  describe('clearParentVerificationToken', () => {
    it('should clear verification token fields', async () => {
      const mock = { _id: 'parent123' };
      Parent.findByIdAndUpdate.mockReturnValue(leanExec(mock));

      const result = await authDao.clearParentVerificationToken('parent123');
      expect(result).toEqual(mock);
      expect(Parent.findByIdAndUpdate).toHaveBeenCalledWith(
        'parent123',
        { $unset: { verificationToken: '', verificationTokenExpires: '' } },
        { new: true }
      );
    });
  });

  describe('findChildById', () => {
    it('should find child by ID (found)', async () => {
      const mock = { _id: 'child123', parentId: 'parent123', firstName: 'João' };
      Child.findById.mockReturnValue(leanExec(mock));

      const result = await authDao.findChildById('child123');
      expect(result).toEqual(mock);
    });

    it('should return null when child not found', async () => {
      Child.findById.mockReturnValue(leanExec(null));
      const result = await authDao.findChildById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findActiveChildByParentAndName', () => {
    it('should find active child by parent and name (found)', async () => {
      const mock = { _id: 'child123', parentId: 'parent123', firstName: 'João', isActive: true };
      Child.findOne.mockReturnValue(leanExec(mock));

      const result = await authDao.findActiveChildByParentAndName('parent123', 'João');
      expect(result).toEqual(mock);
      expect(Child.findOne).toHaveBeenCalledWith({
        parentId: 'parent123',
        firstName: 'João',
        isActive: true,
      });
    });

    it('should return null when no active child found', async () => {
      Child.findOne.mockReturnValue(leanExec(null));
      const result = await authDao.findActiveChildByParentAndName('parent123', 'Nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createChild', () => {
    it('should create and return new child', async () => {
      const raw = { _id: 'child123', parentId: 'parent123', firstName: 'João' };
      const doc = { ...raw, toObject: () => raw };
      Child.create.mockResolvedValue(doc);

      const result = await authDao.createChild({ parentId: 'parent123', firstName: 'João' });
      expect(result).toEqual(raw);
    });
  });

  describe('activateChild', () => {
    it('should activate child', async () => {
      const mock = { _id: 'child123', isActive: true };
      Child.findByIdAndUpdate.mockReturnValue(leanExec(mock));

      const result = await authDao.activateChild('child123');
      expect(result).toEqual(mock);
      expect(Child.findByIdAndUpdate).toHaveBeenCalledWith('child123', { isActive: true }, { new: true });
    });
  });
});
