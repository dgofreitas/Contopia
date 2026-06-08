// Contopia — Parent Manager Tests (STORY-053: Activity Summary + Book List, STORY-054: Export + Deletion)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ── Mock pino ─────────────────────────────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// ── Mock parent DAO ───────────────────────────────────────────────────────────
vi.mock('../parent-dao.js', () => ({
  findParentByIdWithChild: vi.fn(),
  getWeeklyBookCount: vi.fn(),
  getWeeklyBooksReadCount: vi.fn(),
  getWeeklyReadingTimeForChild: vi.fn(),
  getChildBookTitlesWithCovers: vi.fn(),
  countChildBooks: vi.fn(),
  findChildBooksWithChapters: vi.fn(),
  findPendingDeletionByChild: vi.fn(),
  findPendingDeletionByParentAndChild: vi.fn(),
  findDeletionStatusByParent: vi.fn(),
  createDeletionRequest: vi.fn(),
  cancelDeletionRequest: vi.fn(),
}));

// ── Mock storage dependencies ─────────────────────────────────────────────────
vi.mock('../../storage/storage-dao.js', () => ({
  findAssetRecordById: vi.fn(),
}));

vi.mock('../../storage/storage-service.js', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('../../book/book-dao.js', () => ({
  findAssetsByBook: vi.fn(),
  createActivityLog: vi.fn(),
}));

// ── Mock email service ────────────────────────────────────────────────────────
vi.mock('../../common/email-service.js', () => ({
  sendDeletionConfirmationEmail: vi.fn(),
}));

// ── Mock storage config (s3Client) — no external refs (vitest hoist) ──
vi.mock('../../storage/storage-config.js', () => ({
  s3Client: { send: vi.fn().mockResolvedValue({ Body: { pipe: vi.fn(), on: vi.fn() } }) },
  BUCKET_NAME: 'contopia-test',
}));

// ── Mock archiver — must not reference outer scope ────────────────────────────────
vi.mock('archiver', () => {
  const mockArchive = {
    append: vi.fn().mockReturnThis(),
    finalize: vi.fn().mockResolvedValue(undefined),
    pipe: vi.fn(),
    on: vi.fn(),
  };
  return { default: vi.fn(() => mockArchive) };
});

import * as parentManager from '../parent-manager.js';
import * as parentDao from '../parent-dao.js';
import * as storageDao from '../../storage/storage-dao.js';
import * as storageService from '../../storage/storage-service.js';
import { findAssetsByBook, createActivityLog } from '../../book/book-dao.js';
import { sendDeletionConfirmationEmail } from '../../common/email-service.js';
import archiver from 'archiver';
import { s3Client } from '../../storage/storage-config.js';

const PARENT_ID = new mongoose.Types.ObjectId().toString();
const CHILD_ID = new mongoose.Types.ObjectId().toString();
const DELETION_REQUEST_ID = new mongoose.Types.ObjectId().toString();

describe('Parent Manager — STORY-053', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getChildActivitySummary ──────────────────────────────────────────────────

  describe('getChildActivitySummary', () => {
    it('should return summary with aggregated weekly data', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getWeeklyBookCount.mockResolvedValue(3);
      parentDao.getWeeklyBooksReadCount.mockResolvedValue(2);
      parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(2700000); // 45 min

      // Act
      const result = await parentManager.getChildActivitySummary(PARENT_ID);

      // Assert
      expect(result).toEqual({
        booksWritten: 3,
        booksRead: 2,
        readingTimeMinutes: 45,
        childFirstName: 'Julia',
        childId: CHILD_ID.toString(),
        hasActivity: true,
      });
    });

    it('should return zero defaults when no activity exists', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Carlos' },
      });
      parentDao.getWeeklyBookCount.mockResolvedValue(0);
      parentDao.getWeeklyBooksReadCount.mockResolvedValue(0);
      parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(0);

      // Act
      const result = await parentManager.getChildActivitySummary(PARENT_ID);

      // Assert
      expect(result).toEqual({
        booksWritten: 0,
        booksRead: 0,
        readingTimeMinutes: 0,
        childFirstName: 'Carlos',
        childId: CHILD_ID.toString(),
        hasActivity: false,
      });
    });

    it('should return empty defaults when parent has no child', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue(null);

      // Act
      const result = await parentManager.getChildActivitySummary(PARENT_ID);

      // Assert
      expect(result).toEqual({
        booksWritten: 0,
        booksRead: 0,
        readingTimeMinutes: 0,
        childFirstName: null,
        childId: null,
        hasActivity: false,
      });
    });

    it('should round reading time to whole minutes', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Ana' },
      });
      parentDao.getWeeklyBookCount.mockResolvedValue(1);
      parentDao.getWeeklyBooksReadCount.mockResolvedValue(1);
      parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(65000); // 1.083 min

      // Act
      const result = await parentManager.getChildActivitySummary(PARENT_ID);

      // Assert
      expect(result.readingTimeMinutes).toBe(1);
    });

    it('should call DAO methods with correct childId', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Test' },
      });

      // Act
      await parentManager.getChildActivitySummary(PARENT_ID);

      // Assert
      expect(parentDao.getWeeklyBookCount).toHaveBeenCalledWith(CHILD_ID);
      expect(parentDao.getWeeklyBooksReadCount).toHaveBeenCalledWith(CHILD_ID);
      expect(parentDao.getWeeklyReadingTimeForChild).toHaveBeenCalledWith(CHILD_ID);
    });
  });

  // ── getChildBookList ─────────────────────────────────────────────────────────

  describe('getChildBookList', () => {
    const bookId1 = new mongoose.Types.ObjectId().toString();
    const bookId2 = new mongoose.Types.ObjectId().toString();

    it('should return paginated book list with enriched thumbnail URLs', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getChildBookTitlesWithCovers.mockResolvedValue([
        {
          _id: bookId1, title: 'Book A', coverAssetId: new mongoose.Types.ObjectId(),
          status: 'published', updatedAt: new Date('2026-06-05T10:00:00Z'),
        },
        {
          _id: bookId2, title: 'Book B', coverAssetId: null,
          status: 'draft', updatedAt: new Date('2026-06-06T10:00:00Z'),
        },
      ]);
      parentDao.countChildBooks.mockResolvedValue(2);
      findAssetsByBook.mockResolvedValue([
        { url: 'assets/cover_thumb_1.png', type: 'cover_thumbnail' },
      ]);
      storageService.getSignedUrl.mockResolvedValue('/signed/assets/cover_thumb_1.png');

      // Act
      const result = await parentManager.getChildBookList(PARENT_ID, { limit: 20, skip: 0 });

      // Assert
      expect(result).toEqual({
        books: [
          {
            bookId: bookId1,
            title: 'Book A',
            coverThumbnailUrl: '/signed/assets/cover_thumb_1.png',
            status: 'published',
            updatedAt: expect.any(Date),
          },
          {
            bookId: bookId2,
            title: 'Book B',
            coverThumbnailUrl: null,
            status: 'draft',
            updatedAt: expect.any(Date),
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      });
    });

    it('should return empty result when parent has no child', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue(null);

      // Act
      const result = await parentManager.getChildBookList(PARENT_ID);

      // Assert
      expect(result).toEqual({ books: [], total: 0, limit: 20, offset: 0 });
    });

    it('should use cover asset URL fallback when no thumbnail exists', async () => {
      // Arrange
      const coverAssetId = new mongoose.Types.ObjectId();
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getChildBookTitlesWithCovers.mockResolvedValue([
        {
          _id: bookId1, title: 'Book A', coverAssetId,
          status: 'published', updatedAt: new Date(),
        },
      ]);
      parentDao.countChildBooks.mockResolvedValue(1);
      // No thumbnail found
      findAssetsByBook.mockResolvedValue([]);
      // Fallback to cover asset
      storageDao.findAssetRecordById.mockResolvedValue({ url: 'assets/cover.png' });
      storageService.getSignedUrl.mockResolvedValue('/signed/assets/cover.png');

      // Act
      const result = await parentManager.getChildBookList(PARENT_ID);

      // Assert
      expect(result.books[0].coverThumbnailUrl).toBe('/signed/assets/cover.png');
    });

    it('should handle thumbnail resolution failure gracefully', async () => {
      // Arrange
      const coverAssetId = new mongoose.Types.ObjectId();
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getChildBookTitlesWithCovers.mockResolvedValue([
        {
          _id: bookId1, title: 'Book A', coverAssetId,
          status: 'published', updatedAt: new Date(),
        },
      ]);
      parentDao.countChildBooks.mockResolvedValue(1);
      // Both thumbnail and cover asset lookups fail
      findAssetsByBook.mockRejectedValue(new Error('DB error'));
      storageDao.findAssetRecordById.mockRejectedValue(new Error('DB error'));

      // Act
      const result = await parentManager.getChildBookList(PARENT_ID);

      // Assert: coverThumbnailUrl should be null, not crash
      expect(result.books[0].coverThumbnailUrl).toBeNull();
      expect(result.books[0].title).toBe('Book A');
    });

    it('should set coverThumbnailUrl null when there is no coverAssetId', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getChildBookTitlesWithCovers.mockResolvedValue([
        {
          _id: bookId1, title: 'No Cover Book', coverAssetId: null,
          status: 'draft', updatedAt: new Date(),
        },
      ]);
      parentDao.countChildBooks.mockResolvedValue(1);

      // Act
      const result = await parentManager.getChildBookList(PARENT_ID);

      // Assert
      expect(result.books[0].coverThumbnailUrl).toBeNull();
      expect(findAssetsByBook).not.toHaveBeenCalled();
    });

    it('should pass pagination params to DAO', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.getChildBookTitlesWithCovers.mockResolvedValue([]);
      parentDao.countChildBooks.mockResolvedValue(0);

      // Act
      await parentManager.getChildBookList(PARENT_ID, { limit: 10, skip: 5 });

      // Assert
      expect(parentDao.getChildBookTitlesWithCovers).toHaveBeenCalledWith(CHILD_ID, { limit: 10, skip: 5 });
      expect(parentDao.countChildBooks).toHaveBeenCalledWith(CHILD_ID);
    });
  });
});

// ── STORY-054: Export & Deletion Tests ──────────────────────────────────────────

describe('Parent Manager — STORY-054 (Export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportChildData', () => {
    it('should return archive and childFirstName for valid parent', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Book One',
          createdAt: new Date('2026-01-01'),
          chapters: [
            { order: 1, title: 'Ch1', content: 'Chapter 1 content' },
            { order: 2, title: 'Ch2', content: 'Chapter 2 content' },
          ],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue(null); // no covers

      // Act
      const result = await parentManager.exportChildData(PARENT_ID);

      // Assert
      expect(result.archive).toBeDefined();
      expect(result.childFirstName).toBe('Julia');
      expect(parentDao.findChildBooksWithChapters).toHaveBeenCalledWith(CHILD_ID);
    });

    it('should throw 404 when parent has no child', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue(null);

      // Act & Assert
      await expect(parentManager.exportChildData(PARENT_ID)).rejects.toThrow('No child account found');
      await expect(parentManager.exportChildData(PARENT_ID)).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should create ZIP with books as .txt files', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Book One',
          createdAt: new Date('2026-01-01'),
          chapters: [
            { order: 1, title: 'Ch1', content: 'Hello' },
            { order: 2, title: 'Ch2', content: 'World' },
          ],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue(null);

      // Act
      await parentManager.exportChildData(PARENT_ID);

      // Assert: archiver.append called with book content and metadata
      const archiveInstance = archiver();
      expect(archiveInstance.append).toHaveBeenCalledWith(
        'Hello\n\n---\n\nWorld',
        { name: 'books/Book One.txt' },
      );
      expect(archiveInstance.append).toHaveBeenCalledWith(
        expect.any(String),
        { name: 'metadata.json' },
      );
      expect(archiveInstance.finalize).toHaveBeenCalled();
    });

    it('should sanitize special characters in book titles', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'A/B:C*D?E"F<G>H|I',
          createdAt: new Date(),
          chapters: [{ order: 1, title: 'Ch', content: 'Content' }],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue(null);

      // Act
      await parentManager.exportChildData(PARENT_ID);

      // Assert: unsafe filename chars replaced with _
      const archiveInstance = archiver();
      expect(archiveInstance.append).toHaveBeenCalledWith(
        'Content',
        { name: 'books/A_B_C_D_E_F_G_H_I.txt' },
      );
    });

    it('should create valid metadata.json with book count and details', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Livro A',
          createdAt: new Date('2026-01-01'),
          chapters: [{ order: 1, title: 'Ch', content: 'A' }],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue(null);

      // Act
      await parentManager.exportChildData(PARENT_ID);

      // Assert: metadata.json appended
      const archiveInstance = archiver();
      const metadataCall = archiveInstance.append.mock.calls.find(
        ([, opts]) => opts.name === 'metadata.json',
      );
      expect(metadataCall).toBeDefined();
      const metadata = JSON.parse(metadataCall[0]);
      expect(metadata.bookCount).toBe(1);
      expect(metadata.books[0].title).toBe('Livro A');
      expect(metadata.books[0].chapterCount).toBe(1);
      expect(metadata.exportDate).toBeDefined();
    });

    it('should add cover images when book has coverAssetId', async () => {
      // Arrange
      const bookId = new mongoose.Types.ObjectId();
      const coverAssetId = new mongoose.Types.ObjectId();
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: bookId,
          title: 'With Cover',
          createdAt: new Date(),
          coverAssetId,
          chapters: [{ order: 1, title: 'Ch', content: 'Content' }],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'covers/book1.png',
        mimeType: 'image/png',
      });

      // Act
      await parentManager.exportChildData(PARENT_ID);

      // Assert: cover appended to archive with .png extension
      const archiveInstance = archiver();
      const coverCall = archiveInstance.append.mock.calls.find(
        ([, opts]) => opts.name.includes('covers/'),
      );
      expect(coverCall).toBeDefined();
      expect(coverCall[1].name).toBe(`covers/${bookId}.png`);
    });

    it('should handle cover with jpeg mime type', async () => {
      // Arrange
      const bookId = new mongoose.Types.ObjectId();
      const coverAssetId = new mongoose.Types.ObjectId();
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: bookId,
          title: 'JPEG Cover',
          createdAt: new Date(),
          coverAssetId,
          chapters: [{ order: 1, title: 'Ch', content: 'Content' }],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'covers/book1.jpg',
        mimeType: 'image/jpeg',
      });

      // Act
      await parentManager.exportChildData(PARENT_ID);

      // Assert: .jpg extension used
      const archiveInstance = archiver();
      const coverCall = archiveInstance.append.mock.calls.find(
        ([, opts]) => opts.name.includes('covers/'),
      );
      expect(coverCall).toBeDefined();
      expect(coverCall[1].name).toBe(`covers/${bookId}.jpg`);
    });

    it('should skip cover images gracefully when S3 fetch fails', async () => {
      // Arrange
      const bookId = new mongoose.Types.ObjectId();
      const coverAssetId = new mongoose.Types.ObjectId();
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([
        {
          _id: bookId,
          title: 'Broken Cover',
          createdAt: new Date(),
          coverAssetId,
          chapters: [{ order: 1, title: 'Ch', content: 'Content' }],
        },
      ]);
      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'covers/broken.png',
        mimeType: 'image/png',
      });
      // s3Client.send rejects
      s3Client.send.mockRejectedValueOnce(new Error('S3 timeout'));

      // Act — should not throw
      const result = await parentManager.exportChildData(PARENT_ID);

      // Assert: export should still succeed
      expect(result.archive).toBeDefined();
      expect(result.childFirstName).toBe('Julia');
    });

    it('should handle parent with empty book list', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: CHILD_ID, firstName: 'Maria' },
      });
      parentDao.findChildBooksWithChapters.mockResolvedValue([]);
      storageDao.findAssetRecordById.mockResolvedValue(null);

      // Act
      const result = await parentManager.exportChildData(PARENT_ID);

      // Assert: archive still created with metadata
      expect(result.archive).toBeDefined();
      expect(result.childFirstName).toBe('Maria');
      const archiveInstance = archiver();
      const metadataCall = archiveInstance.append.mock.calls.find(
        ([, opts]) => opts.name === 'metadata.json',
      );
      expect(metadataCall).toBeDefined();
      const metadata = JSON.parse(metadataCall[0]);
      expect(metadata.bookCount).toBe(0);
      expect(metadata.books).toEqual([]);
    });
  });
});

describe('Parent Manager — STORY-054 (Deletion)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestAccountDeletion', () => {
    it('should create deletion request and return confirmation when confirmText is DELETE', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.createDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        parentId: PARENT_ID,
        childId: CHILD_ID,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      sendDeletionConfirmationEmail.mockResolvedValue({ success: true });
      createActivityLog.mockResolvedValue({});

      // Act
      const result = await parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      });

      // Assert
      expect(result.deletionRequestId).toBe(DELETION_REQUEST_ID);
      expect(result.status).toBe('pending');
      expect(result.confirmationEmailSent).toBe(true);
      expect(result.childId).toBe(CHILD_ID);
      expect(sendDeletionConfirmationEmail).toHaveBeenCalledWith({
        to: 'parent@test.com',
        childFirstName: 'Julia',
        expiresAt: expect.any(Date),
      });
      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_DELETION_REQUESTED',
          actorType: 'parent',
          actorId: PARENT_ID,
        }),
      );
    });

    it('should throw 400 when confirmText is not DELETE', async () => {
      // Act & Assert
      await expect(parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'delete',
      })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('should throw 400 when confirmText is empty string', async () => {
      await expect(parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: '',
      })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('should throw 409 when deletion already pending', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        childId: CHILD_ID,
        status: 'pending',
      });

      // Act & Assert
      await expect(parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      })).rejects.toMatchObject({ status: 409, code: 'DELETION_ALREADY_PENDING' });
    });

    it('should throw 404 when parent has no child', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue(null);

      // Act & Assert
      await expect(parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('should throw 403 when child does not belong to parent', async () => {
      // Arrange
      const wrongChildId = new mongoose.Types.ObjectId().toString();
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: wrongChildId, firstName: 'Wrong' },
      });

      // Act & Assert
      await expect(parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('should handle email send failure gracefully (email best-effort)', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.createDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      sendDeletionConfirmationEmail.mockResolvedValue({ success: false });
      createActivityLog.mockResolvedValue({});

      // Act
      const result = await parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      });

      // Assert
      expect(result.confirmationEmailSent).toBe(false);
      expect(result.deletionRequestId).toBe(DELETION_REQUEST_ID);
    });

    it('should handle email exception gracefully', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.createDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      sendDeletionConfirmationEmail.mockRejectedValue(new Error('SMTP down'));
      createActivityLog.mockResolvedValue({});

      // Act
      const result = await parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      });

      // Assert
      expect(result.confirmationEmailSent).toBe(false);
    });

    it('should handle ActivityLog failure gracefully', async () => {
      // Arrange
      parentDao.findPendingDeletionByChild.mockResolvedValue(null);
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID, email: 'parent@test.com' },
        child: { _id: CHILD_ID, firstName: 'Julia' },
      });
      parentDao.createDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      sendDeletionConfirmationEmail.mockResolvedValue({ success: true });
      createActivityLog.mockRejectedValue(new Error('Log DB error'));

      // Act — should not throw
      const result = await parentManager.requestAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
        confirmText: 'DELETE',
      });

      // Assert: still returns success
      expect(result.deletionRequestId).toBe(DELETION_REQUEST_ID);
      expect(result.confirmationEmailSent).toBe(true);
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should cancel a pending deletion request', async () => {
      // Arrange
      parentDao.findPendingDeletionByParentAndChild.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        childId: CHILD_ID,
        status: 'pending',
      });
      parentDao.cancelDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        status: 'cancelled',
        cancelledAt: new Date(),
      });
      createActivityLog.mockResolvedValue({});

      // Act
      const result = await parentManager.cancelAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
      });

      // Assert
      expect(result.status).toBe('cancelled');
      expect(result.deletionRequestId).toBe(DELETION_REQUEST_ID);
      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_DELETION_CANCELLED',
          actorType: 'parent',
        }),
      );
    });

    it('should throw 404 when no pending request exists', async () => {
      // Arrange
      parentDao.findPendingDeletionByParentAndChild.mockResolvedValue(null);

      // Act & Assert
      await expect(parentManager.cancelAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
      })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('should handle ActivityLog failure gracefully on cancel', async () => {
      // Arrange
      parentDao.findPendingDeletionByParentAndChild.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        childId: CHILD_ID,
        status: 'pending',
      });
      parentDao.cancelDeletionRequest.mockResolvedValue({
        _id: DELETION_REQUEST_ID,
        status: 'cancelled',
        cancelledAt: new Date(),
      });
      createActivityLog.mockRejectedValue(new Error('DB error'));

      // Act — should not throw
      const result = await parentManager.cancelAccountDeletion({
        parentId: PARENT_ID,
        childId: CHILD_ID,
      });

      // Assert
      expect(result.status).toBe('cancelled');
    });
  });

  // ── getDeletionStatus (STORY-054 FIX) ─────────────────────────────────────────

  describe('getDeletionStatus', () => {
    it('should return hasPendingDeletion true with childId and expiresAt when pending deletion exists', async () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      parentDao.findDeletionStatusByParent.mockResolvedValue({
        childId: CHILD_ID,
        status: 'pending',
        expiresAt,
      });

      // Act
      const result = await parentManager.getDeletionStatus(PARENT_ID);

      // Assert
      expect(result).toEqual({
        hasPendingDeletion: true,
        childId: CHILD_ID,
        expiresAt,
      });
      expect(parentDao.findDeletionStatusByParent).toHaveBeenCalledWith(PARENT_ID);
    });

    it('should return hasPendingDeletion false with no childId/expiresAt when no pending deletion', async () => {
      // Arrange
      parentDao.findDeletionStatusByParent.mockResolvedValue(null);

      // Act
      const result = await parentManager.getDeletionStatus(PARENT_ID);

      // Assert
      expect(result).toEqual({ hasPendingDeletion: false });
      expect(parentDao.findDeletionStatusByParent).toHaveBeenCalledWith(PARENT_ID);
    });
  });
});