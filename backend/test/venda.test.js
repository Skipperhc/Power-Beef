import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarVenda } from '../src/registrarVenda.js';

function model(estoque) {
  return {
    db: { transaction: async callback => callback('session') },
    find(filtro) {
      assert.equal(filtro.status, 'em_estoque');
      assert.equal(filtro.tipo, 'original');
      return { sort(ordem) {
        assert.equal(ordem.validade, 1);
        return { limit: quantidade => ({ session: async () => estoque.slice(0, quantidade) }) };
      } };
    },
    updateMany: async (filtro, update, options) => {
      assert.equal(options.session, 'session');
      assert.equal(update.$set.status, 'vendido');
      assert.equal(update.$set.dataVenda.toISOString(), '2026-11-13T00:00:00.000Z');
      return { modifiedCount: filtro._id.$in.length };
    },
  };
}
const dados = { tipo: 'original', quantidade: 10, dataVenda: '2026-11-13' };
test('marca exatamente dez pacotes como vendidos com data', async () => {
  const resultado = await registrarVenda(model(Array.from({ length: 12 }, (_, i) => ({ _id: String(i) }))), dados);
  assert.equal(resultado.quantidade, 10);
  assert.equal(resultado.ids.length, 10);
});
test('estoque insuficiente não executa atualização', async () => {
  const Model = model([{ _id: '1' }]);
  Model.updateMany = () => assert.fail('Não deve atualizar');
  await assert.rejects(registrarVenda(Model, dados), e => e.status === 409);
});
test('rejeita sabor, quantidade e data inválidos', async () => {
  for (const alteracao of [{ tipo: 'outro' }, { quantidade: 0 }, { quantidade: 1.5 }, { dataVenda: '2026-02-30' }, { dataVenda: undefined }]) {
    await assert.rejects(registrarVenda(model([]), { ...dados, ...alteracao }), e => e.status === 400);
  }
});
test('aborta se a atualização não atingir a quantidade selecionada', async () => {
  const Model = model([{ _id: '1' }]);
  Model.updateMany = async () => ({ modifiedCount: 0 });
  await assert.rejects(registrarVenda(Model, { ...dados, quantidade: 1 }), e => e.status === 409);
});
