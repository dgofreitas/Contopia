const mongoose = require('mongoose');

// Amizade entre duas famílias. Um responsável convida (from) e o outro aceita (to).
// Só depois de aceita as crianças de uma família enxergam as da outra e podem
// mandar livros umas para as outras.
const familyLinkSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true },
);
familyLinkSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = mongoose.models.FamilyLink || mongoose.model('FamilyLink', familyLinkSchema);
