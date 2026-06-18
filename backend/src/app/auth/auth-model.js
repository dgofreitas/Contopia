// Contopia — Auth Models (Parent & Child & SessionAuditLog)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// ── Parent Schema ───────────────────────────────────────────────────────────
const parentSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      select: false, // never included by default — only loaded for login
    },
    ageConsentAt: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

parentSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// ── Child Schema ────────────────────────────────────────────────────────────
const childSchema = new Schema(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: [true, 'Parent ID is required'],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 30,
    },
    avatarSeed: {
      type: String,
      required: [true, 'Avatar seed is required'],
      default: 'avatar_default',
    },
    password: {
      type: String,
      select: false, // never included by default — only loaded for login
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete soft-deleted children after 30 days
childSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

childSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compound unique: only one active child per parent per name
childSchema.index(
  { parentId: 1, firstName: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

// ── Session Audit Log Schema ────────────────────────────────────────────────
const sessionAuditSchema = new Schema(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: ['SESSION_CREATED', 'SESSION_REFRESHED', 'SESSION_LOGOUT', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'CHILD_SESSION_CREATED', 'PARENT_SESSION_CREATED', 'PARENT_LOGIN_FAILED', 'PARENT_LOGOUT', 'PARENT_REGISTRATION_CONSENT', 'LOGIN_FAILED', 'EMAIL_CHECK'],
      required: true,
    },
    emailHash: {
      type: String,
    },
    ip: {
      type: String,
    },
    deviceHint: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete audit logs after 365 days
sessionAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const Parent = mongoose.model('Parent', parentSchema);
const Child = mongoose.model('Child', childSchema);
const SessionAuditLog = mongoose.model('SessionAuditLog', sessionAuditSchema);

export { Parent, Child, SessionAuditLog };