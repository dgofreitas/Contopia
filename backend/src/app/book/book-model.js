// Contopia — Book Module Models (Book, Chapter, Asset, ReadingProgress, ActivityLog)
import mongoose from 'mongoose';

const { Schema } = mongoose;

// ── Book Schema ───────────────────────────────────────────────────────────────
const bookSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Author ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    chapterIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Chapter',
      default: [],
    },
    coverAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    language: {
      type: String,
      default: 'pt-BR',
      maxlength: 5,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'books',
  }
);

// Compound indexes with partial filter for soft delete
bookSchema.index(
  { authorId: 1, status: 1, deletedAt: 1, createdAt: -1 },
  { partialFilterExpression: { deletedAt: null } }
);
bookSchema.index(
  { authorId: 1, createdAt: -1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);
bookSchema.index(
  { status: 1, publishedAt: -1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);
bookSchema.index(
  { authorId: 1, status: 1, publishedAt: -1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);
bookSchema.index({ title: 'text' }, { language_override: 'searchLanguage', collation: { locale: 'simple' } });

// ── Spine Color Virtual ──────────────────────────────────────────────────────
// Deterministic pastel from book ID — child-safe palette
bookSchema.virtual('spineColor').get(function () {
  const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const idx = this._id.toString().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  return palette[idx];
});

bookSchema.set('toObject', { virtuals: true });
bookSchema.set('toJSON', { virtuals: true });

// ── Chapter Schema ────────────────────────────────────────────────────────────
const chapterSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book ID is required'],
      index: true,
    },
    order: {
      type: Number,
      required: [true, 'Chapter order is required'],
      min: 0,
    },
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: '',
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'chapters',
  }
);

// Unique compound index: no two active chapters share same bookId+order
chapterSchema.index(
  { bookId: 1, order: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
chapterSchema.index(
  { bookId: 1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);

// ── Asset Schema ─────────────────────────────────────────────────────────────
const assetSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book ID is required'],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Author ID is required'],
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Asset URL is required'],
    },
    type: {
      type: String,
      enum: ['cover', 'spine', 'edge', 'upload'],
      required: [true, 'Asset type is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      maxlength: 100,
    },
    sizeBytes: {
      type: Number,
      required: [true, 'Size in bytes is required'],
      min: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'assets',
  }
);

assetSchema.index(
  { bookId: 1, type: 1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);
assetSchema.index(
  { authorId: 1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);

// ── ReadingProgress Schema ────────────────────────────────────────────────────
const readingProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'User ID is required'],
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book ID is required'],
    },
    lastChapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      default: null,
    },
    lastPosition: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'reading_progress',
  }
);

// One progress doc per user per book
readingProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, updatedAt: -1 });

// ── ActivityLog Schema (append-only, no soft delete) ──────────────────────────
const activityLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Actor ID is required'],
    },
    actorType: {
      type: String,
      enum: ['child', 'parent', 'system'],
      required: [true, 'Actor type is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      maxlength: 100,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    targetType: {
      type: String,
      enum: ['book', 'chapter', 'asset', 'user', 'system'],
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'activity_logs',
  }
);

// TTL index: auto-delete logs after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ targetId: 1, targetType: 1 });

// ── Register Models ──────────────────────────────────────────────────────────
const Book = mongoose.model('Book', bookSchema);
const Chapter = mongoose.model('Chapter', chapterSchema);
const Asset = mongoose.model('Asset', assetSchema);
const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export { Book, Chapter, Asset, ReadingProgress, ActivityLog };