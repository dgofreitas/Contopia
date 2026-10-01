const mongoose = require('mongoose');

// Livro de outra criança que esta criança já abriu. Serve para mostrar o que é
// novidade na estante da família e dos amigos.
const bookReadSchema = new mongoose.Schema(
  {
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  },
  { timestamps: true },
);
bookReadSchema.index({ childId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.models.BookRead || mongoose.model('BookRead', bookReadSchema);
