const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    html: { type: String, default: '' },
  },
  { _id: false },
);

const bookSchema = new mongoose.Schema(
  {
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['livro'], default: 'livro' },
    cover: {
      color: { type: String, required: true },
      sticker: { type: String, default: '' },
    },
    chapters: { type: [chapterSchema], default: () => [{ title: 'Capítulo 1', html: '' }] },
    favorite: { type: Boolean, default: false },
    // Onde a criança parou de ler
    progress: {
      chapter: { type: Number, default: 0 },
      page: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },
    // Fase 1: tudo privado. Público e compartilhado chegam na Fase 3.
    visibility: { type: String, enum: ['private'], default: 'private' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
