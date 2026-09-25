const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Registro do consentimento exigido pela LGPD para menores de 12 anos
    consentAt: { type: Date, required: true },
    // Código curto que a criança digita para achar a família no próprio aparelho
    familyCode: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Parent || mongoose.model('Parent', parentSchema);
