const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Registro do consentimento exigido pela LGPD para menores de 12 anos
    consentAt: { type: Date, required: true },
    // Código secreto que a criança digita para achar a família no próprio aparelho.
    // Começa aleatório; o responsável pode trocar por um que decore (ex: FREITAS123).
    familyCode: { type: String, required: true, unique: true },
    // Nome público da família (ex: freitas), para os outros acharem na hora de
    // compartilhar livros e criar grupos. Não dá acesso à entrada das crianças.
    familyName: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Parent || mongoose.model('Parent', parentSchema);
