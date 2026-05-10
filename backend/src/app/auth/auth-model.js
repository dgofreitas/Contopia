// Contopia — Auth Models (Parent & Child)
import mongoose from 'mongoose';

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
    isActive: {
      type: Boolean,
      default: false,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique: only one active child per parent per name
childSchema.index(
  { parentId: 1, firstName: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

const Parent = mongoose.model('Parent', parentSchema);
const Child = mongoose.model('Child', childSchema);

export { Parent, Child };