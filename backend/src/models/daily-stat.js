const mongoose = require('mongoose');

// Contadores do dia para o painel do admin (entradas, senhas erradas, erros do servidor).
const dailyStatSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // AAAA-MM-DD no horário de Brasília
    key: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: false },
);

dailyStatSchema.index({ day: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.DailyStat || mongoose.model('DailyStat', dailyStatSchema);
