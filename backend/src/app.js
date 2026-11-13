import mongoose from 'mongoose';
import { Pacote } from './models/Pacote.js';
import { mongoConnection } from './database/MongoConnection.js';
import { registrarVenda } from './registrarVenda.js';
import { cadastrarPacotes, modificarPacote } from './estoquePedidos.js';

const campos = ['tipo', 'dataFabricacao', 'validade', 'lote', 'status', 'observacoes'];
function enviar(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(dados === undefined ? undefined : JSON.stringify(dados));
}
async function lerDados(req, permitirQuantidade = false, camposAceitos = campos) {
  let corpo = '';
  for await (const parte of req) {
    corpo += parte;
    if (Buffer.byteLength(corpo) > 16384) throw Object.assign(new Error('Corpo muito grande.'), { status: 413 });
  }
  let dados;
  try { dados = JSON.parse(corpo); } catch { throw Object.assign(new Error('Envie JSON válido.'), { status: 400 }); }
  if (!dados || Array.isArray(dados) || typeof dados !== 'object' || Object.keys(dados).some(c => !camposAceitos.includes(c) && !(permitirQuantidade && c === 'quantidade'))) {
    throw Object.assign(new Error('Campos inválidos no pacote.'), { status: 400 });
  }
  for (const [campo, valor] of Object.entries(dados)) {
    if (campo === 'quantidade') {
      if (!Number.isInteger(valor) || valor < 1 || valor > 1000) {
        throw Object.assign(new Error('A quantidade deve ser um número inteiro entre 1 e 1000.'), { status: 400 });
      }
      continue;
    }
    if (typeof valor !== 'string') throw Object.assign(new Error(`O campo ${campo} deve ser texto.`), { status: 400 });
    if (campo === 'status' && !['em_estoque', 'vendido', 'descartado'].includes(valor)) throw Object.assign(new Error('Status inválido para alteração manual.'), { status: 400 });
    if (['dataFabricacao', 'validade'].includes(campo)) {
      const data = new Date(valor);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw Object.assign(new Error(`Data inválida: ${campo}. Use YYYY-MM-DD.`), { status: 400 });
      }
    }
  }
  return dados;
}
export function criarApp(Model = Pacote, database = mongoConnection, cadastrar = cadastrarPacotes, modificar = modificarPacote) {
  return async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/pacotes/venda') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return enviar(res, 405, { message: 'Use POST.' }); }
        if (!database.isConnected) return enviar(res, 503, { message: 'Banco indisponível.' });
        return enviar(res, 200, await registrarVenda(Model, await lerDados(req, true, ['tipo', 'dataVenda'])));
      }
      if (path === '/api/health' && req.method === 'GET') return enviar(res, database.isConnected ? 200 : 503, { status: database.isConnected ? 'ok' : 'unavailable' });
      const rota = path.match(/^\/api\/pacotes(?:\/([^/]+))?\/?$/);
      if (!rota) return enviar(res, 404, { message: 'Rota não encontrada.' });
      const id = rota[1];
      const metodos = id ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST'];
      if (!metodos.includes(req.method)) {
        res.setHeader('Allow', metodos.join(', '));
        return enviar(res, 405, { message: 'Método não permitido.' });
      }
      if (id && !mongoose.isObjectIdOrHexString(id)) return enviar(res, 400, { message: 'ID inválido.' });
      if (!database.isConnected) return enviar(res, 503, { message: 'Banco indisponível. Tente novamente.' });
      if (!id && req.method === 'GET') return enviar(res, 200, await Model.find().sort({ createdAt: -1 }));
      if (!id && req.method === 'POST') {
        const { quantidade, ...dados } = await lerDados(req, true);
        // Preserva a resposta do cadastro unitário para clientes existentes.
        const pacotes = await cadastrar(dados, quantidade ?? 1, Model);
        if (quantidade === undefined) return enviar(res, 201, pacotes[0]);
        return enviar(res, 201, { quantidade: pacotes.length, pacotes });
      }
      if (req.method === 'GET') {
        const pacote = await Model.findById(id);
        return enviar(res, pacote ? 200 : 404, pacote || { message: 'Pacote não encontrado.' });
      }
      const pacote = await modificar(id, req.method === 'PUT' ? await lerDados(req) : null, Model);
      if (req.method === 'PUT') return enviar(res, 200, pacote);
      return enviar(res, 204);
    } catch (error) {
      if (error.name === 'ValidationError') return enviar(res, 400, {
        message: 'Confira os campos do pacote.',
        errors: Object.fromEntries(Object.entries(error.errors).map(([c, e]) => [c, e.message])),
      });
      return enviar(res, error.status ?? 500, { message: error.status ? error.message : 'Não foi possível concluir a operação.' });
    }
  };
}
