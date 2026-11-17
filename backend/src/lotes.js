import { datasPacote } from './datasPacote.js';

export async function gerarLote(session, Model, Controle, ano = Number(datasPacote().dataFabricacao.slice(0, 4))) {
  if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) throw new Error('Ano do lote inválido.');
  // Considera códigos já existentes, inclusive após atualização de uma versão antiga.
  const existentes = await Model.find({ lote: { $regex: `^[0-9]{3}-${ano}$` } }).sort({ lote: -1 }).limit(1).session(session);
  const maior = existentes.length ? Number(existentes[0].lote.slice(0, 3)) : 0;
  const _id = `lotes:${ano}`;
  await Controle.updateOne({ _id }, { $max: { ultimoLote: maior }, $setOnInsert: { versao: 0 } }, { upsert: true, session });
  const contador = await Controle.findOneAndUpdate({ _id, ultimoLote: { $lt: 999 } }, { $inc: { ultimoLote: 1 } }, { new: true, session, runValidators: true });
  if (!contador) throw Object.assign(new Error(`O limite de 999 lotes de ${ano} foi atingido.`), { status: 409 });
  return `${String(contador.ultimoLote).padStart(3, '0')}-${ano}`;
}
