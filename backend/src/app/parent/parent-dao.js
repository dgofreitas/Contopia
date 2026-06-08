// Contopia — Parent Dashboard Data Access Object
import { Parent, Child } from '../auth/auth-model.js';
import { Book } from '../book/book-model.js';

/**
 * Find a parent by ID with their child populated.
 * Returns { parent, child } or null if parent not found.
 */
export async function findParentByIdWithChild(parentId) {
  const parent = await Parent.findById(parentId).lean().exec();

  if (!parent) return null;

  const child = await Child.findOne({
    parentId: parent._id,
    isActive: true,
    deletedAt: null,
  }).lean().exec();

  return { parent, child };
}

/**
 * Get the count of books created by a child.
 * Returns the total number of books (all statuses).
 */
export async function getChildBookCount(childId) {
  const count = await Book.countDocuments({ authorId: childId, deletedAt: null }).exec();
  return count;
}