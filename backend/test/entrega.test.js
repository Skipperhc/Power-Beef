import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEntrega } from '../src/entrega.js';
const entrega = { nome: 'Maria Silva', whatsapp: '(41) 99906-8051', endereco: 'Rua Teste, 123, Curitiba/PR', referencia: '' };
test('normaliza contato brasileiro, preserva endereço e aceita o código do país', () => {
  assert.equal(validarEntrega(entrega).whatsapp, '5541999068051');
  assert.deepEqual(validarEntrega({ ...entrega, whatsapp: '+55 (41) 99906-8051' }), validarEntrega(entrega));
  assert.equal(validarEntrega({ ...entrega, endereco: 'Rua Teste, 123\nCuritiba/PR' }).endereco, 'Rua Teste, 123 Curitiba/PR');
});
test('exige entrega e rejeita nomes, endereços, DDDs e celulares inválidos', () => {
  for (const dados of [undefined, [], {}, { ...entrega, nome: '  ' }, { ...entrega, endereco: 'Rua' }, { ...entrega, whatsapp: '41999999999' }, { ...entrega, whatsapp: '20999068051' }, { ...entrega, whatsapp: '4133334444' }, { ...entrega, whatsapp: 'abc41999068051' }, { ...entrega, referencia: 'x'.repeat(201) }, { ...entrega, admin: true }]) assert.throws(() => validarEntrega(dados), e => e.status === 400);
});
