const mongoose = require('mongoose');

// Quem usou o site em cada dia, para o painel do admin contar os ativos.
// Uma linha por pessoa por dia; não guarda o que ela fez.
const dailyActiveSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // AAAA-MM-DD no horário de Brasília
    who: { type: String, enum: ['child', 'parent'], required: true },
    personId: { type: mongoose.Schema.Types.ObjectId, required: true },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: true },
  },
  { timestamps: false },
);

dailyActiveSchema.index({ day: 1, who: 1, personId: 1 }, { unique: true });

module.exports = mongoose.models.DailyActive || mongoose.model('DailyActive', dailyActiveSchema);
