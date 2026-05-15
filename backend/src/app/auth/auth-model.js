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
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

parentSchema.index({ verificationToken: 1 }, { sparse: true });

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
      maxlength: 50,
    },
    password: {
      type: String,
      select: false, // never included by default — only loaded for login
    },
    isActive: {
      type: Boolean,
      default: false,
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
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: ['SESSION_CREATED', 'SESSION_REFRESHED', 'SESSION_LOGOUT', 'SESSION_EXPIRED', 'SESSION_REVOKED'],
      required: true,
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

// TTL index: auto-delete audit logs after 90 days
sessionAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Parent = mongoose.model('Parent', parentSchema);
const Child = mongoose.model('Child', childSchema);
const SessionAuditLog = mongoose.model('SessionAuditLog', sessionAuditSchema);

export { Parent, Child, SessionAuditLog };