const mongoose = require('mongoose');

const childSchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    nickname: { type: String, required: true, trim: true },
    avatar: { type: String, required: true },
    // A criança entra com figuras, com uma senha normal ou com as duas.
    picturePasswordHash: { type: String, default: null },
    textPasswordHash: { type: String, default: null },
    theme: { type: String, default: 'fadas' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Child || mongoose.model('Child', childSchema);
