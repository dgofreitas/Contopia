const mongoose = require('mongoose');

// Imagem que a criança colocou no texto de um livro. O arquivo mora no volume
// de uploads; aqui fica só quem é o dono, para conferir o acesso.
const bookImageSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    file: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.BookImage || mongoose.model('BookImage', bookImageSchema);
