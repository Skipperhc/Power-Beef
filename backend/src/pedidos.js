import mongoose from 'mongoose';
import { Pedido } from './models/Pedido.js';
import { Pacote, TIPOS_POWER_BEEF } from './models/Pacote.js';
import { ControleEstoque } from './models/ControleEstoque.js';
import { travarEstoque, reservar, mudarStatus, atenderProducao, conflito } from './estoquePedidos.js';

const erro = (message, status = 400) => Object.assign(new Error(message), { status });
export function validarPedido(dados) {
  if (!dados || Object.keys(dados).some(k => !['itens', 'chaveEnvio'].includes(k)) ||
      typeof dados.chaveEnvio !== 'string' || !/^[a-f0-9-]{36}$/i.test(dados.chaveEnvio) ||
      !Array.isArray(dados.itens) || !dados.itens.length || dados.itens.length > 4) throw erro('Carrinho inválido.');
  const tipos = new Set();
  for (const item of dados.itens) {
    if (!item || typeof item !== 'object' || Object.keys(item).some(k => !['tipo', 'quantidade'].includes(k)) ||
        !TIPOS_POWER_BEEF.includes(item.tipo) || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 1000 || tipos.has(item.tipo)) throw erro('Itens inválidos. Informe de 1 a 1000 pacotes por sabor.');
    tipos.add(item.tipo);
  }
  return dados.itens.map(({ tipo, quantidade }) => ({ tipo, quantidade, reservada: 0 }));
}
export async function alterarPedido(id, status, usuario, { Pedidos = Pedido, Model = Pacote, Controle = ControleEstoque } = {}) {
  if (usuario.perfil !== 'administrador') throw erro('Somente administradores alteram pedidos.', 403);
  return Pedidos.db.transaction(async session => {
    await travarEstoque(session, Controle);
    await atenderProducao(session, Model, Pedidos);
    const pedido = await Pedidos.findById(id).session(session);
    if (!pedido) throw erro('Pedido não encontrado.', 404);
    if (pedido.status === status) return pedido;
    const permitidos = { pedido_enviado: ['aceito', 'em_producao'], em_producao: ['aceito'], aceito: ['entregue'], entregue: ['encerrado'], encerrado: [] };
    if (!permitidos[pedido.status]?.includes(status)) throw conflito('Essa alteração de status não é permitida.');
    if (status === 'aceito' || status === 'em_producao') {
      // Pedidos já em produção têm prioridade sobre novos pedidos.
      const completo = await reservar(pedido, session, Model);
      if (status === 'aceito' && !completo) throw conflito('Estoque insuficiente. Marque o pedido como em produção para reservar o disponível.');
      mudarStatus(pedido, completo ? 'aceito' : 'em_producao', usuario.id);
    } else {
      if (status === 'entregue') {
        const total = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);
        const resultado = await Model.updateMany({ pedido: pedido._id, status: 'reservado' },
          { $set: { status: 'vendido', dataVenda: new Date() } }, { session, runValidators: true });
        if (resultado.modifiedCount !== total) throw conflito('Reserva inconsistente. Confira os pacotes do pedido.');
      }
      mudarStatus(pedido, status, usuario.id);
    }
    await pedido.save({ session }); return pedido;
  });
}
export async function gerenciarPedidos(req, path, usuario, lerJson, Pedidos = Pedido) {
  const rota = path.match(/^\/api\/pedidos(?:\/([^/]+))?\/?$/);
  if (!rota) throw erro('Rota não encontrada.', 404);
  const id = rota[1]; const admin = usuario.perfil === 'administrador';
  if (id && !mongoose.isObjectIdOrHexString(id)) throw erro('ID inválido.');
  if (!id && req.method === 'GET') return { status: 200, body: await Pedidos.find(admin ? {} : { cliente: usuario.id }).sort({ createdAt: -1 }).lean() };
  if (!id && req.method === 'POST') {
    const dados = await lerJson(req); const itens = validarPedido(dados);
    const filtro = { cliente: usuario.id, chaveEnvio: dados.chaveEnvio };
    let pedido = await Pedidos.findOne(filtro);
    if (!pedido) {
      try { pedido = await Pedidos.create({ ...filtro, clienteNome: usuario.nome, clienteEmail: usuario.email, itens, historico: [{ status: 'pedido_enviado', autor: usuario.id }] }); }
      catch (e) { if (e.code !== 11000) throw e; pedido = await Pedidos.findOne(filtro); }
    }
    const conteudo = lista => JSON.stringify(lista.map(i => [i.tipo, i.quantidade]).sort());
    if (!pedido || conteudo(pedido.itens) !== conteudo(itens)) throw conflito('Esse envio já foi usado em outro pedido. Atualize o carrinho.');
    return { status: 201, body: pedido };
  }
  if (id && req.method === 'GET') {
    const pedido = await Pedidos.findOne({ _id: id, ...(admin ? {} : { cliente: usuario.id }) });
    if (!pedido) throw erro('Pedido não encontrado.', 404);
    return { status: 200, body: pedido };
  }
  if (id && req.method === 'PUT') {
    if (!admin) throw erro('Somente administradores alteram pedidos.', 403);
    const dados = await lerJson(req);
    if (Object.keys(dados).length !== 1 || typeof dados.status !== 'string') throw erro('Envie apenas o status.');
    return { status: 200, body: await alterarPedido(id, dados.status, usuario) };
  }
  throw erro('Método não permitido.', 405);
}
