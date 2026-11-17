import mongoose from 'mongoose';

const schema = new mongoose.Schema({ _id: String, versao: { type: Number, default: 0 }, ultimoLote: { type: Number, min: 0, max: 999, default: 0 } }, { collection: 'controle_estoque' });
export const ControleEstoque = mongoose.model('ControleEstoque', schema);
