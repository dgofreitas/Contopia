// Contopia — Parent Module Models (DeletionRequest)
import mongoose from 'mongoose';

const { Schema } = mongoose;

// ── DeletionRequest Schema (STORY-054) ────────────────────────────────────────
const deletionRequestSchema = new Schema(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: [true, 'Parent ID is required'],
      index: true,
    },
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'cancelled', 'completed'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'deletion_requests',
  }
);

// Index for child login check: find pending deletion by childId
deletionRequestSchema.index({ childId: 1, status: 1 });

// Index for cron job: find expired pending requests
deletionRequestSchema.index({ status: 1, expiresAt: 1 });

const DeletionRequest = mongoose.model('DeletionRequest', deletionRequestSchema);

export { DeletionRequest };