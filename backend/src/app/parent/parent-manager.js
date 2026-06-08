// Contopia — Parent Dashboard Business Logic Manager
import { findParentByIdWithChild, getChildBookCount } from './parent-dao.js';

/**
 * Get child activity summary for the parent dashboard.
 * Returns { bookCount, timeSpent }.
 * timeSpent is a placeholder (will be implemented in a future story).
 */
export async function getChildActivitySummary(parentId) {
  const parentIdStr = parentId.toString();
  const result = await findParentByIdWithChild(parentIdStr);

  if (!result) {
    const err = new Error('Parent not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const { child } = result;

  let bookCount = 0;
  if (child) {
    bookCount = await getChildBookCount(child._id);
  }

  return {
    bookCount,
    timeSpent: 0, // Placeholder: will be populated by future story
    childFirstName: child?.firstName || null,
    childId: child?._id?.toString() || null,
  };
}