// Contopia — Storage Data Access Object (asset records)
import { Asset } from '../book/book-model.js';

/**
 * Create an asset record in MongoDB.
 * @param {object} data — { bookId, authorId, url, type, mimeType, sizeBytes }
 * @returns {object} — Lean asset document
 */
export async function createAssetRecord(data) {
  const doc = await Asset.create(data);
  return doc.toObject();
}

/**
 * Find an active (non-deleted) asset record by ID.
 * @param {string} id — Asset _id
 * @returns {object|null} — Lean asset document or null
 */
export async function findAssetRecordById(id) {
  return Asset.findOne({ _id: id, deletedAt: null }).lean().exec();
}

/**
 * Hard-delete an asset record (GDPR full erasure).
 * @param {string} id — Asset _id
 * @returns {object|null} — Deleted document or null
 */
export async function hardDeleteAssetRecord(id) {
  return Asset.findByIdAndDelete(id).lean().exec();
}

/**
 * Soft-delete all active assets for an author (sets deletedAt).
 * @param {string} authorId — Author/owner ID
 * @returns {object} — UpdateMany result
 */
export async function softDeleteAssetsByAuthor(authorId) {
  const now = new Date();
  return Asset.updateMany({ authorId, deletedAt: null }, { deletedAt: now }).exec();
}

/**
 * Find all active (non-deleted) assets for an author.
 * @param {string} authorId — Author/owner ID
 * @returns {object[]} — Array of lean asset documents
 */
export async function findAssetsByAuthor(authorId) {
  return Asset.find({ authorId, deletedAt: null }).lean().exec();
}