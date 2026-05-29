// Contopia — ReadingPreferences Model
// STORY-032: Font Size & Theme Settings
import mongoose from 'mongoose';

const { Schema } = mongoose;

// ── ReadingPreferences Schema ──────────────────────────────────────────────────
const readingPreferencesSchema = new Schema(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required'],
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    theme: {
      type: String,
      enum: ['light', 'sepia', 'dark'],
      default: 'light',
    },
    readingMode: {
      type: String,
      enum: ['paginated', 'scroll'],
      default: 'paginated',
    },
  },
  {
    timestamps: true,
    collection: 'reading_preferences',
  }
);

// One preferences doc per child (unique index)
readingPreferencesSchema.index({ childId: 1 }, { unique: true });

// ── Register Model ────────────────────────────────────────────────────────────
const ReadingPreferences = mongoose.model('ReadingPreferences', readingPreferencesSchema);

export { ReadingPreferences };