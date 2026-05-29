// Contopia — Reader Preferences Data Access Object
// STORY-032: Font Size & Theme Settings
import { ReadingPreferences } from './reading-preferences-model.js';

// ── Reader Preferences DAO ──────────────────────────────────────────────────────

/**
 * Find reading preferences for a child.
 * @param {string} childId - The child's ObjectId as string
 * @returns {Promise<Object|null>} Preferences doc or null
 */
export async function findPreferences(childId) {
  return ReadingPreferences.findOne({ childId }).lean().exec();
}

/**
 * Upsert reading preferences for a child.
 * Creates new doc if none exists, updates existing otherwise.
 * Only updates fields provided in the update object.
 * @param {string} childId - The child's ObjectId as string
 * @param {object} update - Fields to update { fontSize?, theme?, readingMode? }
 * @returns {Promise<Object>} Updated preferences doc
 */
export async function upsertPreferences(childId, update) {
  return ReadingPreferences.findOneAndUpdate(
    { childId },
    { $set: { ...update, childId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean().exec();
}