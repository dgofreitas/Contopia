// Contopia — Parent Dashboard Business Logic Manager
import pino from 'pino';
import archiver from 'archiver';
import {
  findParentByIdWithChild,
  getWeeklyBookCount,
  getWeeklyBooksReadCount,
  getWeeklyReadingTimeForChild,
  getChildBookTitlesWithCovers,
  countChildBooks,
  findChildBooksWithChapters,
  findPendingDeletionByChild,
  findPendingDeletionByParentAndChild,
  findDeletionStatusByParent,
  createDeletionRequest,
  cancelDeletionRequest,
} from './parent-dao.js';
import { findAssetRecordById } from '../storage/storage-dao.js';
import { getSignedUrl as getSignedUrlService } from '../storage/storage-service.js';
import { findAssetsByBook, createActivityLog } from '../book/book-dao.js';
import { sendDeletionConfirmationEmail } from '../common/email-service.js';
import { s3Client, BUCKET_NAME } from '../storage/storage-config.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const logger = pino({ name: 'parent-manager', level: process.env.LOG_LEVEL || 'info' });

/**
 * Get child activity summary for the parent dashboard (STORY-053).
 * Weekly aggregation: books written, books read, reading time in minutes.
 * Returns empty-state defaults when no child exists or no activity.
 */
export async function getChildActivitySummary(parentId) {
  const parentIdStr = parentId.toString();
  const result = await findParentByIdWithChild(parentIdStr);

  if (!result || !result.child) {
    return {
      booksWritten: 0,
      booksRead: 0,
      readingTimeMinutes: 0,
      childFirstName: result?.child?.firstName || null,
      childId: result?.child?._id?.toString() || null,
      hasActivity: false,
    };
  }

  const childId = result.child._id;

  const [booksWritten, booksRead, totalMs] = await Promise.all([
    getWeeklyBookCount(childId),
    getWeeklyBooksReadCount(childId),
    getWeeklyReadingTimeForChild(childId),
  ]);

  const readingTimeMinutes = Math.round(totalMs / 60000);
  const hasActivity = booksWritten > 0 || booksRead > 0 || readingTimeMinutes > 0;

  return {
    booksWritten,
    booksRead,
    readingTimeMinutes,
    childFirstName: result.child.firstName,
    childId: childId.toString(),
    hasActivity,
  };
}

/**
 * Get paginated list of child's books with titles and cover thumbnails only.
 * Privacy: never returns chapterIds, content, or description (STORY-053).
 * Resolves coverThumbnailUrl via asset signed URLs.
 */
export async function getChildBookList(parentId, { limit = 20, skip = 0 } = {}) {
  const parentIdStr = parentId.toString();
  const result = await findParentByIdWithChild(parentIdStr);

  if (!result || !result.child) {
    return { books: [], total: 0, limit, offset: skip };
  }

  const childId = result.child._id;

  const [books, total] = await Promise.all([
    getChildBookTitlesWithCovers(childId, { limit, skip }),
    countChildBooks(childId),
  ]);

  // Resolve cover thumbnail URLs
  const enrichedBooks = await Promise.all(books.map(async (book) => {
    let coverThumbnailUrl = null;

    if (book.coverAssetId) {
      try {
        const bookAssets = await findAssetsByBook(book._id.toString(), { type: 'cover_thumbnail' });
        if (bookAssets.length > 0) {
          coverThumbnailUrl = await getSignedUrlService(bookAssets[0].url);
        } else {
          // Fallback: try the cover asset itself
          const coverAsset = await findAssetRecordById(book.coverAssetId.toString());
          if (coverAsset) {
            coverThumbnailUrl = await getSignedUrlService(coverAsset.url);
          }
        }
      } catch (err) {
        logger.warn({ err, bookId: book._id }, 'Failed to resolve cover thumbnail URL');
      }
    }

    return {
      bookId: book._id.toString(),
      title: book.title,
      coverThumbnailUrl,
      status: book.status,
      updatedAt: book.updatedAt,
    };
  }));

  return {
    books: enrichedBooks,
    total,
    limit,
    offset: skip,
  };
}

// ── Data Export (STORY-054) ─────────────────────────────────────────────────────

/**
 * Sanitize a book title for safe use as a ZIP entry filename.
 * Replaces characters unsafe for filenames: \ / : * ? " < > |
 */
function sanitizeFilename(title) {
  return title.replace(/[/\\:*?"<>|]/g, '_');
}

/**
 * Map MIME type to file extension for cover images.
 */
const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Export all child data as a ZIP archive stream.
 * ZIP contains: books/{title}.txt, metadata.json, covers/{bookId}.{ext}
 * Books are plain text with chapters separated by \n\n---\n\n.
 * @param {string} parentId — Authenticated parent's ID
 * @returns {{ archive: archiver.Archiver, childFirstName: string }}
 */
export async function exportChildData(parentId) {
  const result = await findParentByIdWithChild(parentId.toString());

  if (!result || !result.child) {
    const err = new Error('No child account found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const childId = result.child._id;
  const childFirstName = result.child.firstName;

  const books = await findChildBooksWithChapters(childId);

  const archive = archiver('zip', { zlib: { level: 6 } });

  // Add each book as .txt — chapters joined by separator
  for (const book of books) {
    const content = book.chapters
      .map((ch) => ch.content || '')
      .join('\n\n---\n\n');
    const safeName = sanitizeFilename(book.title);
    archive.append(content, { name: `books/${safeName}.txt` });
  }

  // Add metadata.json
  const metadata = {
    exportDate: new Date().toISOString(),
    bookCount: books.length,
    books: books.map((b) => ({
      title: b.title,
      createdAt: b.createdAt,
      chapterCount: b.chapters.length,
    })),
  };
  archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

  // Add cover images (best-effort: skip on failure)
  for (const book of books) {
    if (!book.coverAssetId) continue;
    try {
      const coverAsset = await findAssetRecordById(book.coverAssetId.toString());
      if (!coverAsset) continue;

      const ext = MIME_TO_EXT[coverAsset.mimeType] || 'png';

      // Stream cover from S3/MinIO
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: coverAsset.url,
      });
      const s3Response = await s3Client.send(getCommand);
      const stream = s3Response.Body;

      archive.append(stream, { name: `covers/${book._id}.${ext}` });
    } catch (err) {
      logger.warn({ err, bookId: book._id }, 'Failed to stream cover image for export — skipping');
    }
  }

  archive.finalize();

  return { archive, childFirstName };
}

// ── Account Deletion (STORY-054) ────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Request account deletion for a child.
 * - Validates confirmText === "DELETE"
 * - Checks no pending deletion already exists (409 if duplicate)
 * - Creates DeletionRequest with 30-day expiry
 * - Sends confirmation email
 * - Creates ActivityLog entry
 * @param {{ parentId: string, childId: string, confirmText: string }} params
 * @returns {{ deletionRequestId: string, childId: string, status: string, expiresAt: string, confirmationEmailSent: boolean }}
 */
export async function requestAccountDeletion({ parentId, childId, confirmText }) {
  if (confirmText !== 'DELETE') {
    const err = new Error('Confirmation text must be "DELETE"');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  // Check for existing pending deletion
  const existing = await findPendingDeletionByChild(childId);
  if (existing) {
    const err = new Error('A deletion request is already pending for this account');
    err.code = 'DELETION_ALREADY_PENDING';
    err.status = 409;
    throw err;
  }

  // Resolve parent+child to get email and name
  const result = await findParentByIdWithChild(parentId.toString());
  if (!result || !result.child) {
    const err = new Error('No child account found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Verify child belongs to this parent
  if (result.child._id.toString() !== childId.toString()) {
    const err = new Error('Child does not belong to this parent');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  // Create DeletionRequest
  const deletionRequest = await createDeletionRequest({
    parentId,
    childId,
    status: 'pending',
    expiresAt,
  });

  // Send confirmation email (best-effort)
  let confirmationEmailSent = false;
  try {
    const emailResult = await sendDeletionConfirmationEmail({
      to: result.parent.email,
      childFirstName: result.child.firstName,
      expiresAt,
    });
    confirmationEmailSent = emailResult.success;
  } catch (err) {
    logger.warn({ err, parentId }, 'Deletion confirmation email failed — continuing');
  }

  // ActivityLog: ACCOUNT_DELETION_REQUESTED (actor: parent)
  try {
    await createActivityLog({
      actorId: parentId,
      actorType: 'parent',
      action: 'ACCOUNT_DELETION_REQUESTED',
      targetId: childId,
      targetType: 'user',
      metadata: { deletionRequestId: deletionRequest._id.toString() },
    });
  } catch (err) {
    logger.warn({ err }, 'ActivityLog creation failed for deletion request');
  }

  logger.info({ deletionRequestId: deletionRequest._id, childId, parentId }, 'Deletion request created');

  return {
    deletionRequestId: deletionRequest._id.toString(),
    childId,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    confirmationEmailSent,
  };
}

/**
 * Cancel a pending account deletion request.
 * - Finds pending request for this parent+child pair
 * - Sets status='cancelled', cancelledAt=now
 * - Creates ActivityLog entry
 * @param {{ parentId: string, childId: string }} params
 * @returns {{ deletionRequestId: string, status: string, cancelledAt: string }}
 */
export async function cancelAccountDeletion({ parentId, childId }) {
  const deletionRequest = await findPendingDeletionByParentAndChild(parentId, childId);

  if (!deletionRequest) {
    const err = new Error('No pending deletion request found for this child');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const cancelled = await cancelDeletionRequest(deletionRequest._id);

  // ActivityLog: ACCOUNT_DELETION_CANCELLED (actor: parent)
  try {
    await createActivityLog({
      actorId: parentId,
      actorType: 'parent',
      action: 'ACCOUNT_DELETION_CANCELLED',
      targetId: childId,
      targetType: 'user',
      metadata: { deletionRequestId: deletionRequest._id.toString() },
    });
  } catch (err) {
    logger.warn({ err }, 'ActivityLog creation failed for deletion cancellation');
  }

  logger.info({ deletionRequestId: deletionRequest._id, childId, parentId }, 'Deletion request cancelled');

  return {
    deletionRequestId: cancelled._id.toString(),
    status: 'cancelled',
    cancelledAt: cancelled.cancelledAt.toISOString(),
  };
}

// ── Deletion Status (STORY-054 FIX) ──────────────────────────────────────────

/**
 * Get the deletion status for a parent's child.
 * Returns { hasPendingDeletion: boolean, childId?: string, expiresAt?: string }.
 * Frontend calls GET /deletion-request/status to determine whether to show
 * DeletionLockedBanner and the pending-cancellation state in DeleteAccountPanel.
 * @param {string} parentId — Authenticated parent's ID
 */
export async function getDeletionStatus(parentId) {
  const status = await findDeletionStatusByParent(parentId.toString());

  if (!status) {
    return { hasPendingDeletion: false };
  }

  return {
    hasPendingDeletion: true,
    childId: status.childId,
    expiresAt: status.expiresAt,
  };
}