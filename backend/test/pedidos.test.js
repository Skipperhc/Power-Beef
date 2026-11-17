import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPedido, gerenciarPedidos, alterarPedido } from '../src/pedidos.js';
import { cadastrarPacotes, modificarPacote } from '../src/estoquePedidos.js';
import { datasPacote } from '../src/datasPacote.js';
import { gerarLote } from '../src/lotes.js';

const admin = { id: '000000000000000000000001', perfil: 'administrador', nome: 'Admin', email: 'a@example.com' };
const cliente = { id: '000000000000000000000002', perfil: 'cliente', nome: 'Cliente', email: 'c@example.com' };
const chave = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('serviço de estoque aplica datas automáticas e impede alterar datas existentes', async () => {
  const f = fixture(); const pacotes = await f.estoque('original', 2);
  for (const pacote of pacotes) {
    assert.equal(pacote.dataFabricacao, datasPacote().dataFabricacao);
    assert.equal(pacote.validade, datasPacote().validade);
  }
  await assert.rejects(modificarPacote(pacotes[0]._id, { validade: '2030-01-01' }, f.Model, f.Pedidos, f.Controle), e => e.status === 400);
  const atualizado = await modificarPacote(pacotes[0]._id, { observacoes: 'Atualizado' }, f.Model, f.Pedidos, f.Controle);
  assert.equal(atualizado.dataFabricacao, pacotes[0].dataFabricacao);
  assert.equal(atualizado.validade, pacotes[0].validade);
});

function fixture() {
  let estado = { pacotes: [], pedidos: [], controles: {} }; let sequencia = 10; let fila = Promise.resolve();
  const copiar = obj => JSON.parse(JSON.stringify(obj));
  const id = () => (++sequencia).toString(16).padStart(24, '0');
  const matches = (obj, filtro) => Object.entries(filtro).every(([campo, valor]) => {
    if (valor && typeof valor === 'object') {
      if ('$in' in valor) return valor.$in.includes(obj[campo]);
      if ('$ne' in valor) return obj[campo] !== valor.$ne;
      if ('$regex' in valor) return new RegExp(valor.$regex).test(obj[campo] || '');
    }
    return valor === null ? obj[campo] == null : obj[campo] === valor;
  });
  const db = { transaction(callback) {
    const atual = fila.then(async () => {
      const backup = copiar(estado);
      try { return await callback('sessao'); } catch (e) { estado = backup; throw e; }
    });
    fila = atual.catch(() => {}); return atual;
  } };
  function model(colecao) {
    function documento(raw) {
      if (!raw) return null;
      const doc = copiar(raw);
      doc.save = async () => { const lista = estado[colecao]; lista[lista.findIndex(p => p._id === doc._id)] = copiar(doc); return doc; };
      doc.deleteOne = async () => { estado[colecao] = estado[colecao].filter(p => p._id !== doc._id); };
      return doc;
    }
    function query(filtro, unico = false) {
      let ordem = {}; let limite = Infinity;
      const obter = () => {
        const linhas = estado[colecao].filter(p => matches(p, filtro)).sort((a, b) => {
          for (const [campo, direcao] of Object.entries(ordem)) {
            const comparacao = String(a[campo]).localeCompare(String(b[campo])) * direcao;
            if (comparacao) return comparacao;
          }
          return 0;
        }).slice(0, limite);
        return unico ? documento(linhas[0]) : linhas.map(documento);
      };
      const q = { sort(o) { ordem = o; return q; }, limit(n) { limite = n; return q; }, session: async () => obter(), lean: async () => copiar(obter()), then: (resolve, reject) => Promise.resolve(obter()).then(resolve, reject) };
      return q;
    }
    const Model = {
      db, find: filtro => query(filtro || {}), findOne: filtro => query(filtro, true), findById: chave => query({ _id: chave }, true),
      async create(dados) {
        const raw = { ...copiar(dados), _id: id(), createdAt: new Date().toISOString(), status: dados.status || (colecao === 'pedidos' ? 'pedido_enviado' : 'em_estoque') };
        if (colecao === 'pacotes') raw.pedido ??= null;
        estado[colecao].push(raw); return documento(raw);
      },
      async insertMany(dados) { const docs = []; for (const dado of dados) docs.push(await Model.create(dado)); return docs; },
      async updateMany(filtro, update) { let modifiedCount = 0; for (const raw of estado[colecao]) if (matches(raw, filtro)) { Object.assign(raw, copiar(update.$set)); modifiedCount++; } return { modifiedCount }; },
    };
    return Model;
  }
  const Model = model('pacotes'); const Pedidos = model('pedidos'); const Controle = {
    async updateOne({ _id }, update) {
      const novo = !estado.controles[_id]; const doc = estado.controles[_id] ??= { _id };
      if (novo) Object.assign(doc, update.$setOnInsert);
      for (const [key, value] of Object.entries(update.$inc || {})) doc[key] = (doc[key] || 0) + value;
      for (const [key, value] of Object.entries(update.$max || {})) doc[key] = Math.max(doc[key] || 0, value);
    },
    async findOneAndUpdate({ _id, ultimoLote }, update) {
      const doc = estado.controles[_id]; if (!doc || doc.ultimoLote >= ultimoLote.$lt) return null;
      doc.ultimoLote += update.$inc.ultimoLote; return copiar(doc);
    },
  };
  const dependencias = { Model, Pedidos, Controle };
  let numero = 0;
  const criar = async (itens, usuario = cliente, chaveEnvio = chave(++numero)) => (await gerenciarPedidos({ method: 'POST' }, '/api/pedidos', usuario, async () => ({ itens, chaveEnvio }), Pedidos)).body;
  const estoque = (tipo, quantidade) => cadastrarPacotes({ tipo, lote: 'TESTE', dataFabricacao: '2026-11-01', validade: '2027-05-01' }, quantidade, Model, Pedidos, Controle);
  const alterar = (pedido, status) => alterarPedido(pedido._id, status, admin, dependencias);
  return { criar, estoque, alterar, dependencias, Model, Pedidos, Controle, estado: () => estado };
}

test('lote único por cadastro, sequência concorrente e sem reutilização após exclusão', async () => {
  const f = fixture(), ano = Number(datasPacote().dataFabricacao.slice(0, 4));
  const [a, b] = await Promise.all([f.estoque('original', 3), f.estoque('picante', 2)]);
  assert.ok(a.every(p => p.lote === `001-${ano}`)); assert.ok(b.every(p => p.lote === `002-${ano}`));
  for (const pacote of [...a, ...b]) await modificarPacote(pacote._id, null, f.Model, f.Pedidos, f.Controle);
  const novo = await f.estoque('original', 1); assert.equal(novo[0].lote, `003-${ano}`);
  await assert.rejects(modificarPacote(novo[0]._id, { lote: 'MANUAL' }, f.Model, f.Pedidos, f.Controle), e => e.status === 400);
});

test('continua códigos existentes, reinicia por ano e respeita o limite de três dígitos', async () => {
  const f = fixture(), ano = Number(datasPacote().dataFabricacao.slice(0, 4));
  await f.Model.create({ tipo: 'original', lote: `009-${ano}` });
  assert.equal((await f.estoque('original', 1))[0].lote, `010-${ano}`);
  assert.equal(await f.Model.db.transaction(session => gerarLote(session, f.Model, f.Controle, ano + 1)), `001-${ano + 1}`);
  f.estado().controles[`lotes:${ano}`].ultimoLote = 998;
  assert.equal((await f.estoque('original', 1))[0].lote, `999-${ano}`);
  await assert.rejects(f.estoque('original', 1), e => e.status === 409);
});

test('falha ao cadastrar desfaz também o avanço do contador do lote', async () => {
  const f = fixture(), ano = Number(datasPacote().dataFabricacao.slice(0, 4));
  await f.estoque('original', 1); const inserir = f.Model.insertMany;
  f.Model.insertMany = async () => { throw new Error('Falha simulada'); };
  await assert.rejects(f.estoque('original', 2), /Falha simulada/);
  f.Model.insertMany = inserir;
  assert.equal((await f.estoque('original', 1))[0].lote, `002-${ano}`);
});

test('aceita exatamente a quantidade pedida e entrega registra a venda uma única vez', async () => {
  const f = fixture(); await f.estoque('brasileirinho', 12);
  const pedido = await f.criar([{ tipo: 'brasileirinho', quantidade: 10 }]);
  await f.alterar(pedido, 'aceito');
  assert.equal(f.estado().pacotes.filter(p => p.status === 'em_estoque').length, 2);
  assert.equal(f.estado().pacotes.filter(p => p.status === 'reservado').length, 10);
  await f.alterar(pedido, 'aceito');
  assert.equal(f.estado().pacotes.filter(p => p.status === 'reservado').length, 10);
  await f.alterar(pedido, 'entregue'); await f.alterar(pedido, 'entregue');
  assert.equal(f.estado().pacotes.filter(p => p.status === 'vendido' && p.dataVenda).length, 10);
  await f.alterar(pedido, 'encerrado');
  await assert.rejects(f.alterar(pedido, 'em_producao'), e => e.status === 409);
});

test('estoque insuficiente desfaz reserva parcial de todos os sabores', async () => {
  const f = fixture(); await f.estoque('original', 3);
  const pedido = await f.criar([{ tipo: 'original', quantidade: 3 }, { tipo: 'picante', quantidade: 2 }]);
  await assert.rejects(f.alterar(pedido, 'aceito'), e => e.status === 409);
  assert.equal(f.estado().pacotes.filter(p => p.status === 'em_estoque').length, 3);
  assert.equal(f.estado().pedidos[0].status, 'pedido_enviado');
  assert.ok(f.estado().pedidos[0].itens.every(i => i.reservada === 0));
});

test('produção reserva o disponível e cadastro de novos pacotes completa automaticamente', async () => {
  const f = fixture(); await f.estoque('original', 3);
  const pedido = await f.criar([{ tipo: 'original', quantidade: 5 }, { tipo: 'picante', quantidade: 2 }]);
  await f.alterar(pedido, 'em_producao');
  assert.equal(f.estado().pedidos[0].itens[0].reservada, 3);
  assert.equal(f.estado().pedidos[0].status, 'em_producao');
  const novos = await f.estoque('original', 2);
  assert.ok(novos.every(p => p.status === 'reservado'));
  assert.equal(f.estado().pedidos[0].status, 'em_producao');
  await f.estoque('picante', 3);
  assert.equal(f.estado().pedidos[0].status, 'aceito');
  assert.equal(f.estado().pacotes.filter(p => p.status === 'reservado').length, 7);
  assert.equal(f.estado().pacotes.filter(p => p.status === 'em_estoque').length, 1);
});

test('prioriza pedidos antigos em produção e não distribui a mesma unidade duas vezes', async () => {
  const f = fixture();
  const primeiro = await f.criar([{ tipo: 'original', quantidade: 3 }]);
  const segundo = await f.criar([{ tipo: 'original', quantidade: 3 }]);
  await f.alterar(primeiro, 'em_producao'); await f.alterar(segundo, 'em_producao');
  await f.estoque('original', 4);
  assert.equal(f.estado().pedidos[0].status, 'aceito');
  assert.equal(f.estado().pedidos[1].itens[0].reservada, 1);
  await f.estoque('original', 2);
  assert.ok(f.estado().pedidos.every(p => p.status === 'aceito'));
  assert.equal(f.estado().pacotes.length, 6);
});

test('duas aceitações concorrentes não consomem o mesmo estoque', async () => {
  const f = fixture(); await f.estoque('original', 10);
  const a = await f.criar([{ tipo: 'original', quantidade: 10 }]);
  const b = await f.criar([{ tipo: 'original', quantidade: 10 }]);
  const resultados = await Promise.allSettled([f.alterar(a, 'aceito'), f.alterar(b, 'aceito')]);
  assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.estado().pacotes.filter(p => p.status === 'reservado').length, 10);
});

test('protege pacotes vinculados a pedidos de edição e exclusão manual', async () => {
  const f = fixture(); await f.estoque('original', 1);
  const pedido = await f.criar([{ tipo: 'original', quantidade: 1 }]); await f.alterar(pedido, 'aceito');
  const id = f.estado().pacotes[0]._id;
  for (const dados of [null, { status: 'em_estoque' }]) await assert.rejects(modificarPacote(id, dados, f.Model, f.Pedidos, f.Controle), e => e.status === 409);
  assert.equal(f.estado().pacotes[0].status, 'reservado');
});

test('reenvio não duplica pedidos e clientes só consultam seus próprios pedidos', async () => {
  const f = fixture(); const itens = [{ tipo: 'original', quantidade: 1 }];
  const a = await f.criar(itens, cliente, chave(50)); const repetido = await f.criar(itens, cliente, chave(50));
  assert.equal(a._id, repetido._id); assert.equal(f.estado().pedidos.length, 1);
  await assert.rejects(f.criar([{ tipo: 'picante', quantidade: 1 }], cliente, chave(50)), e => e.status === 409);
  const outro = { ...cliente, id: '000000000000000000000003' };
  await f.criar(itens, outro);
  const lista = await gerenciarPedidos({ method: 'GET' }, '/api/pedidos', cliente, null, f.Pedidos);
  assert.equal(lista.body.length, 1);
  await assert.rejects(gerenciarPedidos({ method: 'GET' }, `/api/pedidos/${a._id}`, outro, null, f.Pedidos), e => e.status === 404);
  assert.equal((await gerenciarPedidos({ method: 'GET' }, '/api/pedidos', admin, null, f.Pedidos)).body.length, 2);
  await assert.rejects(gerenciarPedidos({ method: 'PUT' }, `/api/pedidos/${a._id}`, cliente, null, f.Pedidos), e => e.status === 403);
});

test('rejeita carrinho adulterado, sabores repetidos e quantidades inválidas', () => {
  for (const itens of [[], [{ tipo: 'outro', quantidade: 1 }], [{ tipo: 'original', quantidade: 0 }], [{ tipo: 'original', quantidade: 1.5 }], [{ tipo: 'original', quantidade: 1001 }], [{ tipo: 'original', quantidade: 1, reservada: 1 }], [{ tipo: 'original', quantidade: 1 }, { tipo: 'original', quantidade: 2 }]]) {
    assert.throws(() => validarPedido({ itens, chaveEnvio: chave(1) }), e => e.status === 400);
  }
});
