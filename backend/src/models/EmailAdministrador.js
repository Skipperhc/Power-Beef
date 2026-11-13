import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
}, { timestamps: true, collection: 'emails_administradores' });

export const EmailAdministrador = mongoose.model('EmailAdministrador', schema);
