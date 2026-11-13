import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  senhaHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  perfil: { type: String, enum: ['administrador', 'cliente'], default: 'cliente', required: true },
  ativo: { type: Boolean, default: true },
  ultimoLogin: { type: Date, default: null },
}, { timestamps: true, collection: 'usuarios' });

export const Usuario = mongoose.model('Usuario', schema);
