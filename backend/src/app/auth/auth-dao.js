// Contopia — Auth Data Access Object
import { Parent, Child, SessionAuditLog } from './auth-model.js';

/**
 * Find a parent by email (case-insensitive, normalized via schema).
 */
export async function findParentByEmail(email) {
  return Parent.findOne({ email }).lean().exec();
}

/**
 * Create a new parent document with email and password.
 * Password is hashed via pre-save hook.
 */
export async function createParent({ email, password }) {
  const doc = await Parent.create({ email, password });
  return doc.toObject();
}

/**
 * Update parent's lastLogin timestamp.
 */
export async function updateParentLastLogin(parentId) {
  return Parent.findByIdAndUpdate(
    parentId,
    { lastLogin: new Date() },
    { new: true }
  ).lean().exec();
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
 * Find all active children for a parent.
 * Used by parent dashboard to list child profiles.
 */
export async function findChildrenByParentId(parentId) {
  return Child.find({
    parentId,
    isActive: true,
    deletedAt: null,
  })
    .lean()
    .exec();
}

/**
 * Find an active child for a parent (first match).
 * Used by parent auth to find the child linked to a parent.
 */
export async function findActiveChildByParent(parentId) {
  return Child.findOne({
    parentId,
    isActive: true,
    deletedAt: null,
  })
    .lean()
    .exec();
}

/**
 * Create a new child document.
 */
export async function createChild({ parentId, firstName, avatarSeed }) {
  const doc = await Child.create({ parentId, firstName, avatarSeed: avatarSeed || 'avatar_default' });
  return doc.toObject();
}

/**
 * Find a child by ID, explicitly selecting the password field.
 * Used for password validation during login.
 */
export async function findChildByIdWithPassword(childId) {
  return Child.findById(childId).select('+password').lean().exec();
}

/**
 * Update a child's password hash.
 */
export async function updateChildPassword(childId, passwordHash) {
  return Child.findByIdAndUpdate(childId, { password: passwordHash }, { new: true }).lean().exec();
}

/**
 * Soft-delete a child by setting deletedAt.
 */
export async function softDeleteChildById(childId) {
  return Child.findByIdAndUpdate(childId, { deletedAt: new Date() }, { new: true }).lean().exec();
}

/**
 * Hard-delete a child document.
 */
export async function hardDeleteChildById(childId) {
  return Child.findByIdAndDelete(childId).lean();
}

/**
 * Create a session audit log entry (fire-and-forget style).
 */
export async function createAuditLog({ childId, parentId, sessionId, event, ip, deviceHint }) {
  const doc = {};
  if (childId) doc.childId = childId;
  if (parentId) doc.parentId = parentId;
  doc.sessionId = sessionId;
  doc.event = event;
  if (ip) doc.ip = ip;
  if (deviceHint) doc.deviceHint = deviceHint;
  return SessionAuditLog.create(doc);
}

// ── Parent Auth DAO Methods ──────────────────────────────────────────────────

/**
 * Find a parent by ID.
 */
export async function findParentById(parentId) {
  return Parent.findById(parentId).lean().exec();
}

/**
 * Find a parent by ID, explicitly selecting the password field.
 * Used for password validation during parent login.
 */
export async function findParentByIdWithPassword(parentId) {
  return Parent.findById(parentId).select('+password').lean().exec();
}

/**
 * Update a parent's password hash.
 */
export async function updateParentPassword(parentId, password) {
  return Parent.findByIdAndUpdate(
    parentId,
    { $set: { password } },
    { new: true }
  )
    .select('+password')
    .lean()
    .exec();
}