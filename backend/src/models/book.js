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
    // Sem capítulos o livro é um texto corrido, guardado como um único capítulo sem título.
    // Livros antigos não têm o campo e continuam com capítulos.
    chaptered: { type: Boolean, default: true },
    chapters: { type: [chapterSchema], default: () => [{ title: 'Capítulo 1', html: '' }] },
    favorite: { type: Boolean, default: false },
    // Livro novo nasce no ateliê (sendo escrito) e vai para a estante quando a criança publica.
    // Livros antigos não têm o campo e continuam na estante.
    published: { type: Boolean, default: true },
    // Onde a criança parou de ler
    progress: {
      chapter: { type: Number, default: 0 },
      page: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },
    // Quem pode ler o livro publicado: só a criança ('private') ou também os
    // irmãos, as outras crianças da mesma família ('family'). Público vem depois.
    visibility: { type: String, enum: ['private', 'family'], default: 'private' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
