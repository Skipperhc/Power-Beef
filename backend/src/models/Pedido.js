import mongoose from 'mongoose';
import { TIPOS_POWER_BEEF } from './Pacote.js';

const itemSchema = new mongoose.Schema({
  tipo: { type: String, enum: TIPOS_POWER_BEEF, required: true },
  quantidade: { type: Number, min: 1, max: 1000, required: true },
  reservada: { type: Number, default: 0, min: 0 },
}, { _id: false });
const schema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  clienteNome: { type: String, required: true },
  clienteEmail: { type: String, required: true },
  chaveEnvio: { type: String, required: true },
  itens: { type: [itemSchema], required: true },
  status: { type: String, enum: ['pedido_enviado', 'em_producao', 'aceito', 'entregue', 'encerrado'], default: 'pedido_enviado', index: true },
  historico: [{ status: String, data: { type: Date, default: Date.now }, autor: String, _id: false }],
}, { timestamps: true, collection: 'pedidos', optimisticConcurrency: true });
schema.index({ cliente: 1, chaveEnvio: 1 }, { unique: true });
schema.index({ status: 1, createdAt: 1 });
export const Pedido = mongoose.model('Pedido', schema);
