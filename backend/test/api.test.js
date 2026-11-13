import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { criarApp } from '../src/app.js';
import { Pacote } from '../src/models/Pacote.js';

test('CRUD HTTP, validações e pacote inexistente', async () => {
  const registros = new Map();
  const Model = {
    db: { transaction: async callback => callback({}) },
    insertMany: async dados => {
      const pacotes = dados.map(dado => new Pacote(dado));
      await Promise.all(pacotes.map(pacote => pacote.validate()));
      for (const pacote of pacotes) registros.set(String(pacote._id), pacote);
      return pacotes;
    },
    find: () => ({ sort: async () => [...registros.values()] }),
    findById: async id => registros.get(id),
    create: async dados => {
      const pacote = new Pacote(dados);
      await pacote.validate();
      pacote.save = async () => { await pacote.validate(); registros.set(String(pacote._id), pacote); };
      pacote.deleteOne = async () => registros.delete(String(pacote._id));
      await pacote.save();
      return pacote;
    },
  };
  const cadastrar = async (dados, quantidade) => {
    const pacotes = [];
    for (let i = 0; i < quantidade; i++) await new Pacote(dados).validate();
    for (let i = 0; i < quantidade; i++) pacotes.push(await Model.create(dados));
    return pacotes;
  };
  const modificar = async (id, dados) => {
    const pacote = await Model.findById(id);
    if (!pacote) throw Object.assign(new Error('Não encontrado.'), { status: 404 });
    if (dados === null) { await pacote.deleteOne(); return; }
    Object.assign(pacote, dados); await pacote.save(); return pacote;
  };
  const server = createServer(criarApp(Model, { isConnected: true }, cadastrar, modificar));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/pacotes`;
  const request = (path = '', method = 'GET', body) => fetch(url + path, {
    method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    assert.deepEqual(await (await request()).json(), []);
    assert.equal((await request('', 'POST', {})).status, 400);
    assert.equal((await request('', 'POST', { tipo: { $ne: '' } })).status, 400);
    assert.equal((await request('', 'POST', { validade: '2026-02-30' })).status, 400);
    const criado = await request('', 'POST', { tipo: 'original', lote: 'TESTE', dataFabricacao: '2026-11-01', validade: '2027-05-01' });
    assert.equal(criado.status, 201);
    const pacote = await criado.json();
    assert.equal((await (await request()).json()).length, 1);
    assert.equal((await request(`/${pacote._id}`)).status, 200);
    const atualizado = await request(`/${pacote._id}`, 'PUT', { tipo: 'picante' });
    assert.equal(atualizado.status, 200);
    assert.equal((await atualizado.json()).tipo, 'picante');
    assert.equal((await request(`/${pacote._id}`, 'PUT', { validade: '2020-01-01' })).status, 400);
    assert.equal((await request('/invalido')).status, 400);
    assert.equal((await request(`/${pacote._id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/${pacote._id}`)).status, 404);
    assert.equal((await request(`/${pacote._id}`, 'DELETE')).status, 404);
    const dadosLote = { tipo: 'churrasco', lote: 'LOTE-20', dataFabricacao: '2026-11-01', validade: '2027-05-01' };
    for (const quantidade of [0, -1, 1.5, 1001, '2', null]) {
      assert.equal((await request('', 'POST', { ...dadosLote, quantidade })).status, 400);
    }
    assert.equal((await request('', 'POST', { ...dadosLote, tipo: 'outro', quantidade: 3 })).status, 400);
    assert.equal(registros.size, 0);
    const lote = await request('', 'POST', { ...dadosLote, quantidade: 20 });
    assert.equal(lote.status, 201);
    const resultado = await lote.json();
    assert.equal(resultado.quantidade, 20);
    assert.equal(resultado.pacotes.length, 20);
    assert.equal(new Set(resultado.pacotes.map(p => p._id)).size, 20);
    assert.ok(resultado.pacotes.every(p => p.lote === 'LOTE-20' && p.tipo === 'churrasco' && p.status === 'em_estoque'));
    assert.equal((await (await request()).json()).length, 20);
    assert.equal((await request(`/${resultado.pacotes[0]._id}`, 'PUT', { quantidade: 2 })).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
