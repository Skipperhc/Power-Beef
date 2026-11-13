import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  expiraEm: { type: Date, required: true, expires: 0 },
}, { timestamps: true, collection: 'sessoes' });

export const Sessao = mongoose.model('Sessao', schema);
