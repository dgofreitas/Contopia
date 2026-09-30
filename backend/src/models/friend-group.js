const mongoose = require('mongoose');

// Grupo de amigos que uma criança monta para mandar livros de uma vez só.
// O livro guarda o grupo, não os membros: quem entra no grupo passa a ler todos
// os livros mandados para ele, e quem sai deixa de ler.
const friendGroupSchema = new mongoose.Schema(
  {
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    name: { type: String, required: true, trim: true },
    members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }], default: [], index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.FriendGroup || mongoose.model('FriendGroup', friendGroupSchema);
