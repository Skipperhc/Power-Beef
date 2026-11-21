import test from 'node:test';
import assert from 'node:assert/strict';
import { enviarEmailAceite, processarEmailAceite, iniciarEmailsPedidos } from '../src/emailPedidos.js';
import { mudarStatus } from '../src/estoquePedidos.js';
const pedido = () => ({ _id: '1234567890abcdef12345678', clienteNome: 'Cliente', clienteEmail: 'cliente@example.com', status: 'aceito', historico: [], itens: [{ tipo: 'original', quantidade: 4 }], entrega: { nome: 'Maria', endereco: 'Rua Teste, 123' }, emailAceite: { estado: 'pendente', tentativas: 0, proximaTentativa: new Date(0) } });
const config = { apiKey: 'chave-de-teste', from: 'Power Beef <pedidos@example.com>', appUrl: 'https://example.com' };
function model(doc) {
  const set = (path, value) => { doc.emailAceite[path.split('.')[1]] = value; };
  return {
    async findOneAndUpdate(query, update) {
      if (doc.status === 'recusado' || doc.emailAceite.tentativas >= 5 || doc.emailAceite.estado === 'enviado' || doc.emailAceite.estado === 'falhou' || (doc.emailAceite.estado === 'enviando' && doc.emailAceite.bloqueadoAte > new Date()) || doc.emailAceite.proximaTentativa > new Date()) return null;
      for (const [p,v] of Object.entries(update.$set)) set(p,v);doc.emailAceite.tentativas++;return structuredClone(doc);
    },
    async updateOne(query, update) { if(query['emailAceite.token']!==doc.emailAceite.token)return;for(const [p,v] of Object.entries(update.$set))set(p,v);for(const p of Object.keys(update.$unset??{}))delete doc.emailAceite[p.split('.')[1]]; },
  };
}
test('monta aviso para o e-mail da conta e envia com chave estável sem expor contato no assunto', async () => {
  const p=pedido();let payload, headers;
  const fetcher=async(url, options)=>{assert.equal(url,'https://api.resend.com/emails');payload=JSON.parse(options.body);headers=options.headers;return {ok:true,json:async()=>({id:'email-1'})};};
  assert.equal(await enviarEmailAceite(p,{...config,fetcher}),'email-1');assert.deepEqual(payload.to,['cliente@example.com']);assert.match(payload.text,/Maria/);assert.match(payload.text,/4 × Original/);assert.match(payload.text,/https:\/\/example.com\/pedidos/);assert.equal(headers['Idempotency-Key'],`pedido-aceito/${p._id}`);
});
test('consome a fila com exclusão mútua e não envia duas vezes após confirmação', async () => {
  const doc=pedido(), Pedidos=model(doc);let enviados=0;const enviar=async()=>{enviados++;return 'email-1';};
  await Promise.all([processarEmailAceite({Pedidos,enviar,config}),processarEmailAceite({Pedidos,enviar,config})]);assert.equal(enviados,1);assert.equal(doc.emailAceite.estado,'enviado');
  await processarEmailAceite({Pedidos,enviar,config});assert.equal(enviados,1);
});
test('falha no provedor preserva o pedido e agenda nova tentativa; limita tentativas', async () => {
  const doc=pedido(), Pedidos=model(doc), enviar=async()=>{throw Error('Falha simulada');};
  await processarEmailAceite({Pedidos,enviar,config});assert.equal(doc.status,'aceito');assert.equal(doc.emailAceite.estado,'pendente');assert.ok(doc.emailAceite.proximaTentativa>new Date());
  doc.emailAceite.tentativas=4;doc.emailAceite.proximaTentativa=new Date(0);await processarEmailAceite({Pedidos,enviar,config});assert.equal(doc.emailAceite.estado,'falhou');
});
test('nenhum envio sem ativação e pedidos recusados não são notificados', async () => {
  assert.equal(typeof iniciarEmailsPedidos({EMAIL_ENABLED:'false'}),'function');assert.equal(await processarEmailAceite({config:null}),false);
  const doc=pedido();doc.status='recusado';assert.equal(await processarEmailAceite({Pedidos:model(doc),config,enviar:async()=>{assert.fail('Não deve enviar');}}),false);
});
test('mudança de status registra um único aviso, sem enfileirar outros estados', () => {
  const doc={historico:[]};mudarStatus(doc,'em_producao','admin');assert.equal(doc.emailAceite,undefined);mudarStatus(doc,'aceito','admin');assert.equal(doc.emailAceite.estado,'pendente');doc.emailAceite.estado='enviado';mudarStatus(doc,'aceito','admin');assert.equal(doc.emailAceite.estado,'enviado');
});
