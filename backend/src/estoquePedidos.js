import { Pacote } from './models/Pacote.js';
import { Pedido } from './models/Pedido.js';
import { ControleEstoque } from './models/ControleEstoque.js';

export const conflito = mensagem => Object.assign(new Error(mensagem), { status: 409 });
export async function travarEstoque(session, Controle = ControleEstoque) {
  await Controle.updateOne({ _id: 'principal' }, { $inc: { versao: 1 } }, { session });
}
export function mudarStatus(pedido, status, autor) {
  pedido.status = status; pedido.historico.push({ status, data: new Date(), autor });
}
export async function reservar(pedido, session, Model = Pacote) {
  for (const item of pedido.itens) {
    const faltam = item.quantidade - item.reservada;
    if (faltam <= 0) continue;
    const pacotes = await Model.find({ tipo: item.tipo, status: 'em_estoque', pedido: null })
      .sort({ validade: 1, createdAt: 1, _id: 1 }).limit(faltam).session(session);
    if (!pacotes.length) continue;
    const resultado = await Model.updateMany({ _id: { $in: pacotes.map(p => p._id) }, status: 'em_estoque', pedido: null },
      { $set: { status: 'reservado', pedido: pedido._id } }, { session, runValidators: true });
    if (resultado.modifiedCount !== pacotes.length) throw conflito('O estoque mudou. Tente novamente.');
    item.reservada += pacotes.length;
  }
  return pedido.itens.every(item => item.reservada === item.quantidade);
}
export async function atenderProducao(session, Model = Pacote, Pedidos = Pedido) {
  const pendentes = await Pedidos.find({ status: 'em_producao' }).sort({ createdAt: 1, _id: 1 }).session(session);
  for (const pedido of pendentes) {
    if (await reservar(pedido, session, Model)) mudarStatus(pedido, 'aceito', 'sistema');
    await pedido.save({ session });
  }
}
export async function cadastrarPacotes(dados, quantidade, Model = Pacote, Pedidos = Pedido, Controle = ControleEstoque) {
  return Model.db.transaction(async session => {
    await travarEstoque(session, Controle);
    const pacotes = await Model.insertMany(Array.from({ length: quantidade }, () => ({ ...dados })), { session });
    await atenderProducao(session, Model, Pedidos);
    // A resposta já reflete pacotes eventualmente reservados para produção.
    return Model.find({ _id: { $in: pacotes.map(p => p._id) } }).session(session);
  });
}
export async function modificarPacote(id, dados, Model = Pacote, Pedidos = Pedido, Controle = ControleEstoque) {
  return Model.db.transaction(async session => {
    await travarEstoque(session, Controle);
    const pacote = await Model.findById(id).session(session);
    if (!pacote) throw Object.assign(new Error('Pacote não encontrado.'), { status: 404 });
    if (pacote.pedido) throw conflito('Este pacote pertence a um pedido e não pode ser alterado ou excluído individualmente.');
    if (dados === null) { await pacote.deleteOne({ session }); return; }
    Object.assign(pacote, dados); await pacote.save({ session });
    await atenderProducao(session, Model, Pedidos);
    return Model.findById(id).session(session);
  });
}
