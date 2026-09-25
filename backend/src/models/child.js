const mongoose = require('mongoose');

const childSchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    nickname: { type: String, required: true, trim: true },
    avatar: { type: String, required: true },
    picturePasswordHash: { type: String, required: true },
    theme: { type: String, default: 'fadas' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Child || mongoose.model('Child', childSchema);
