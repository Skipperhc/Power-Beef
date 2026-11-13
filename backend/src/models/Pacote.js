import mongoose from 'mongoose';

export const TIPOS_POWER_BEEF = Object.freeze([
  'brasileirinho', 'picante', 'churrasco', 'original',
]);

const pacoteSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: TIPOS_POWER_BEEF,
    trim: true,
    lowercase: true,
  },
  dataFabricacao: { type: Date, required: true },
  validade: { type: Date, required: true },
  dataVenda: { type: Date, default: null },
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', default: null, index: true },
  lote: { type: String, required: true, trim: true, maxlength: 100 },
  status: {
    type: String,
    enum: ['em_estoque', 'reservado', 'vendido', 'descartado'],
    default: 'em_estoque',
    required: true,
  },
  observacoes: { type: String, trim: true, maxlength: 2000, default: '' },
}, {
  collection: 'pacotes',
  timestamps: true,
  bufferCommands: false,
});

// Validação do documento completo: usar save() para alterações de datas.
pacoteSchema.pre('validate', function () {
  if (this.dataFabricacao && this.validade && this.validade < this.dataFabricacao) {
    this.invalidate('validade', 'A validade não pode ser anterior à fabricação.');
  }
});

pacoteSchema.index({ status: 1, tipo: 1, validade: 1 });
pacoteSchema.index({ lote: 1 });

export const Pacote = mongoose.model('Pacote', pacoteSchema);
