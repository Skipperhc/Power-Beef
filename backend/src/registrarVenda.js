import { TIPOS_POWER_BEEF } from './models/Pacote.js';

export async function registrarVenda(Model, { tipo, quantidade, dataVenda }) {
  const data = new Date(dataVenda);
  if (!TIPOS_POWER_BEEF.includes(tipo) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1000 ||
      typeof dataVenda !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataVenda) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dataVenda) {
    throw Object.assign(new Error('Informe sabor, quantidade inteira de 1 a 1000 e data da venda válida.'), { status: 400 });
  }
  return Model.db.transaction(async session => {
    const pacotes = await Model.find({ tipo, status: 'em_estoque', dataFabricacao: { $lte: data } })
      .sort({ validade: 1, createdAt: 1, _id: 1 }).limit(quantidade).session(session);
    if (pacotes.length < quantidade) {
      throw Object.assign(new Error(`Estoque insuficiente para essa venda. Disponíveis na data informada: ${pacotes.length}. Nenhum pacote foi alterado.`), { status: 409 });
    }
    const ids = pacotes.map(p => p._id);
    const resultado = await Model.updateMany({ _id: { $in: ids }, status: 'em_estoque' },
      { $set: { status: 'vendido', dataVenda: data } }, { session, runValidators: true });
    if (resultado.modifiedCount !== quantidade) throw Object.assign(new Error('O estoque mudou. Atualize e tente novamente.'), { status: 409 });
    return { quantidade, tipo, dataVenda, ids };
  });
}
