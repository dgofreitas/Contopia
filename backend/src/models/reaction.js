const mongoose = require('mongoose');
const { REACTIONS } = require('../lib/constants');

// Figurinha que uma criança deu para o livro de outra. Cada leitor dá cada
// figurinha uma vez só por livro. seen diz se o autor já viu.
const reactionSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    emoji: { type: String, enum: REACTIONS, required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);
reactionSchema.index({ bookId: 1, childId: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.models.Reaction || mongoose.model('Reaction', reactionSchema);
