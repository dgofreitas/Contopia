// Contopia — Auth Data Access Object
import { Parent, Child } from './auth-model.js';

/**
 * Find a parent by email (case-insensitive, normalized via schema).
 */
export async function findParentByEmail(email) {
  return Parent.findOne({ email: email.toLowerCase() }).lean().exec();
}

/**
 * Find a parent by the SHA-256 hash of their verification JWT.
 * Remember: verificationToken field has select:false, so use .select('+verificationToken +verificationTokenExpires').
 */
export async function findParentByVerificationTokenHash(tokenHash) {
  return Parent.findOne({ verificationToken: tokenHash })
    .select('+verificationToken +verificationTokenExpires')
    .lean()
    .exec();
}

/**
 * Create a new parent document.
 */
export async function createParent({ email }) {
  const doc = await Parent.create({ email });
  return doc.toObject();
}

/**
 * Update parent's verification token hash and expiry.
 */
export async function updateParentVerification(parentId, { verificationToken, verificationTokenExpires }) {
  const doc = await Parent.findByIdAndUpdate(
    parentId,
    { verificationToken, verificationTokenExpires },
    { new: true }
  )
    .select('+verificationToken +verificationTokenExpires')
    .lean()
    .exec();
  return doc;
}

/**
 * Mark parent as verified (isVerified = true).
 */
export async function markParentVerified(parentId) {
  return Parent.findByIdAndUpdate(parentId, { isVerified: true }, { new: true }).lean().exec();
}

/**
 * Clear the verification token hash from parent after verification.
 */
export async function clearParentVerificationToken(parentId) {
  return Parent.findByIdAndUpdate(
    parentId,
    { $unset: { verificationToken: '', verificationTokenExpires: '' } },
    { new: true }
  )
    .lean()
    .exec();
}

/**
 * Find a child by its ID.
 */
export async function findChildById(childId) {
  return Child.findById(childId).lean().exec();
}

/**
 * Find an active child by parent ID and first name.
 * Used to check for duplicate active children.
 */
export async function findActiveChildByParentAndName(parentId, firstName) {
  return Child.findOne({
    parentId,
    firstName,
    isActive: true,
  })
    .lean()
    .exec();
}

/**
 * Create a new child document.
 */
export async function createChild({ parentId, firstName }) {
  const doc = await Child.create({ parentId, firstName });
  return doc.toObject();
}

/**
 * Activate a child (isActive = true).
 */
export async function activateChild(childId) {
  return Child.findByIdAndUpdate(childId, { isActive: true }, { new: true }).lean().exec();
}