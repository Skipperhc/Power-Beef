import test from 'node:test';
import assert from 'node:assert/strict';
import { Pacote, TIPOS_POWER_BEEF } from '../src/models/Pacote.js';
import { MongoConnection } from '../src/database/MongoConnection.js';

const dados = {
  tipo: 'original',
  dataFabricacao: '2026-11-01',
  validade: '2027-05-01',
  lote: 'LOTE-001',
};

test('aceita os quatro sabores e inicia o pacote em estoque', async () => {
  for (const tipo of TIPOS_POWER_BEEF) {
    const pacote = new Pacote({ ...dados, tipo });
    await pacote.validate();
    assert.equal(pacote.status, 'em_estoque');
    assert.ok(pacote._id);
  }
});

test('rejeita campos obrigatórios ausentes', async () => {
  const pacote = new Pacote();
  await assert.rejects(pacote.validate(), (error) => {
    for (const campo of ['tipo', 'dataFabricacao', 'validade', 'lote']) {
      assert.ok(error.errors[campo]);
    }
    return true;
  });
});

test('rejeita sabor desconhecido, lote vazio e datas inválidas', async () => {
  for (const alteracao of [
    { tipo: 'outro' }, { lote: '   ' }, { dataFabricacao: 'inválida' },
    { validade: '2026-10-31' }, { status: 'outro' },
  ]) {
    await assert.rejects(new Pacote({ ...dados, ...alteracao }).validate());
  }
});

test('permite fabricação e validade no mesmo dia', async () => {
  await new Pacote({ ...dados, validade: dados.dataFabricacao }).validate();
});

test('exige URI antes de tentar conexão', async () => {
  await assert.rejects(new MongoConnection().connect(''), /MONGODB_URI/);
});
