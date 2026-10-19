const mongoose = require('mongoose');

// Recado escrito que um leitor deixou no livro de outra criança. Só quem pode
// ler o livro escreve e lê os recados; os responsáveis veem tudo no painel da
// família. seen diz se o autor do livro já viu.
const commentSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    text: { type: String, required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
