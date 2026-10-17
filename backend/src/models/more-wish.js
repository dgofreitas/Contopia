const mongoose = require('mongoose');

// "Quero o próximo capítulo!": um leitor pedindo continuação. chapters guarda
// quantos capítulos o livro tinha no pedido; quando o autor escreve mais um, o
// pedido foi atendido e o leitor pode pedir de novo.
const moreWishSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    chapters: { type: Number, required: true },
  },
  { timestamps: true },
);
moreWishSchema.index({ bookId: 1, childId: 1 }, { unique: true });

module.exports = mongoose.models.MoreWish || mongoose.model('MoreWish', moreWishSchema);
