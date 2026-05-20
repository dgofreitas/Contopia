// Contopia — Autosave Service Integration Tests (STORY-019)
//
// Tests the REAL autosave-service with fake-indexeddb.
// No vi.mock() — we import the actual module.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import autosaveService from '../services/autosave-service';

/**
 * Fully reset the database between tests.
 * Delete the DB, then re-open it so stores/indexes are recreated.
 */
async function resetDatabase() {
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('contopia-autosave');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  // Re-init: openDB will fire onupgradeneeded and recreate everything
  const db = await autosaveService.openDB();
  db.close();
}

describe('autosaveService', () => {
  const bookId = 'book-1';
  const chapterId = 'chapter-1';

  beforeEach(async () => {
    await resetDatabase();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('openDB', () => {
    it('resolves with DB instance with correct name and version', async () => {
      const db = await autosaveService.openDB();
      expect(db.name).toBe('contopia-autosave');
      expect(db.version).toBe(1);
      db.close();
    });

    it('creates object store with expected indices', async () => {
      const db = await autosaveService.openDB();
      expect(db.objectStoreNames.contains('drafts')).toBe(true);

      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      expect(store.indexNames.contains('byTimestamp')).toBe(true);
      expect(store.indexNames.contains('byBookId')).toBe(true);
      tx.abort();
      db.close();
    });
  });

  describe('saveDraft', () => {
    const now = Date.now();
    const draftData = {
      content: '<p>Hello world</p>',
      wordCount: 2,
      timestamp: now,
      serverVersion: null,
      isLocalOnly: true,
    };

    it('saves draft with correct composite key', async () => {
      const result = await autosaveService.saveDraft(bookId, chapterId, draftData);
      expect(result.key).toBe(`books/${bookId}/chapters/${chapterId}`);
      expect(result.bookId).toBe(bookId);
      expect(result.chapterId).toBe(chapterId);
      expect(result.content).toBe('<p>Hello world</p>');
      expect(result.wordCount).toBe(2);
      expect(result.timestamp).toBe(now);
    });

    it('defaults wordCount to 0 when not provided', async () => {
      const result = await autosaveService.saveDraft(bookId, chapterId, { content: '<p>Hi</p>' });
      expect(result.wordCount).toBe(0);
    });

    it('defaults isLocalOnly to true when not provided', async () => {
      const result = await autosaveService.saveDraft(bookId, chapterId, { content: '<p>Hi</p>' });
      expect(result.isLocalOnly).toBe(true);
    });

    it('uses provided timestamp, serverVersion, and isLocalOnly', async () => {
      const ts = 123456789;
      const sv = 987654321;
      const result = await autosaveService.saveDraft(bookId, chapterId, {
        content: '<p>Full</p>', timestamp: ts, serverVersion: sv, isLocalOnly: false,
      });
      expect(result.timestamp).toBe(ts);
      expect(result.serverVersion).toBe(sv);
      expect(result.isLocalOnly).toBe(false);
    });
  });

  describe('saveDraft + getDraft roundtrip', () => {
    const now = Date.now();
    const draftData = {
      content: '<p>Hello world</p>',
      wordCount: 2,
      timestamp: now,
      serverVersion: null,
      isLocalOnly: true,
    };

    it('retrieves saved draft', async () => {
      await autosaveService.saveDraft(bookId, chapterId, draftData);
      const draft = await autosaveService.getDraft(bookId, chapterId);
      expect(draft).not.toBeNull();
      expect(draft.content).toBe('<p>Hello world</p>');
      expect(draft.key).toBe(`books/${bookId}/chapters/${chapterId}`);
    });

    it('returns null when no draft exists', async () => {
      const draft = await autosaveService.getDraft(bookId, chapterId);
      expect(draft).toBeNull();
    });

    it('returns null for different bookId', async () => {
      await autosaveService.saveDraft(bookId, chapterId, draftData);
      const draft = await autosaveService.getDraft('other-book', chapterId);
      expect(draft).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    const now = Date.now();
    const draftData = {
      content: '<p>Hello world</p>',
      wordCount: 2,
      timestamp: now,
      serverVersion: null,
      isLocalOnly: true,
    };

    it('removes draft from DB', async () => {
      await autosaveService.saveDraft(bookId, chapterId, draftData);
      await autosaveService.deleteDraft(bookId, chapterId);
      const draft = await autosaveService.getDraft(bookId, chapterId);
      expect(draft).toBeNull();
    });

    it('removes localStorage key', async () => {
      const lsKey = `autosave_draft_${bookId}_${chapterId}`;
      localStorage.setItem(lsKey, JSON.stringify({ content: 'test' }));
      await autosaveService.saveDraft(bookId, chapterId, draftData);
      await autosaveService.deleteDraft(bookId, chapterId);
      expect(localStorage.getItem(lsKey)).toBeNull();
    });
  });

  describe('getAllPendingDrafts', () => {
    it('returns drafts sorted by timestamp', async () => {
      const now = Date.now();
      await autosaveService.saveDraft(bookId, 'ch-1', { content: '<p>First</p>', timestamp: now + 3000 });
      await autosaveService.saveDraft(bookId, 'ch-2', { content: '<p>Second</p>', timestamp: now + 1000 });
      await autosaveService.saveDraft(bookId, 'ch-3', { content: '<p>Third</p>', timestamp: now + 2000 });

      const drafts = await autosaveService.getAllPendingDrafts();
      expect(drafts).toHaveLength(3);
      expect(drafts[0].timestamp).toBe(now + 1000);
      expect(drafts[1].timestamp).toBe(now + 2000);
      expect(drafts[2].timestamp).toBe(now + 3000);
    });

    it('returns empty array when no drafts', async () => {
      const drafts = await autosaveService.getAllPendingDrafts();
      expect(drafts).toEqual([]);
    });
  });

  describe('cleanupOldDrafts', () => {
    it('removes old drafts beyond maxAge', async () => {
      const now = Date.now();
      const oldTs = now - 10 * 24 * 60 * 60 * 1000;
      const recentTs = now - 2 * 24 * 60 * 60 * 1000;

      await autosaveService.saveDraft(bookId, 'ch-old', { content: '<p>Old</p>', timestamp: oldTs });
      await autosaveService.saveDraft(bookId, 'ch-recent', { content: '<p>Recent</p>', timestamp: recentTs });

      await autosaveService.cleanupOldDrafts(7, 50);

      const drafts = await autosaveService.getAllPendingDrafts();
      expect(drafts).toHaveLength(1);
      expect(drafts[0].chapterId).toBe('ch-recent');
    });

    it('removes drafts exceeding maxCount (keeps newest)', async () => {
      const now = Date.now();
      for (let i = 1; i <= 5; i++) {
        await autosaveService.saveDraft(bookId, `ch-${i}`, { content: `<p>Draft ${i}</p>`, timestamp: now + i * 1000 });
      }

      await autosaveService.cleanupOldDrafts(365, 3);

      const drafts = await autosaveService.getAllPendingDrafts();
      expect(drafts).toHaveLength(3);
      expect(drafts[0].chapterId).toBe('ch-3');
      expect(drafts[1].chapterId).toBe('ch-4');
      expect(drafts[2].chapterId).toBe('ch-5');
    });
  });

  describe('QuotaExceededError fallback', () => {
    it('falls back to localStorage when IndexedDB throws QuotaExceededError', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const origOpen = indexedDB.open;
      indexedDB.open = vi.fn(() => {
        const req = {};
        setTimeout(() => {
          if (req.onerror) req.onerror({ target: { error: Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' }) } });
        }, 0);
        return req;
      });

      const result = await autosaveService.saveDraft(bookId, chapterId, { content: '<p>Fallback</p>' });

      expect(result.isLocalOnly).toBe(true);
      const lsKey = `autosave_draft_${bookId}_${chapterId}`;
      const lsData = JSON.parse(localStorage.getItem(lsKey));
      expect(lsData).not.toBeNull();
      expect(lsData.content).toBe('<p>Fallback</p>');
      expect(consoleSpy).toHaveBeenCalledWith('[autosave] IndexedDB quota exceeded, falling back to localStorage');

      indexedDB.open = origOpen;
      consoleSpy.mockRestore();
    });

    it('throws when localStorage also fails after QuotaExceededError', async () => {
      const origOpen = indexedDB.open;
      indexedDB.open = vi.fn(() => {
        const req = {};
        setTimeout(() => {
          if (req.onerror) req.onerror({ target: { error: Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' }) } });
        }, 0);
        return req;
      });

      const lsSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage full');
      });

      await expect(
        autosaveService.saveDraft(bookId, chapterId, { content: '<p>Test</p>' })
      ).rejects.toThrow('localStorage full');

      lsSpy.mockRestore();
      indexedDB.open = origOpen;
    });
  });
});
