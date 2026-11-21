import test from 'node:test';
import assert from 'node:assert/strict';
import { configurarEmail } from '../src/configEmail.js';
import { checarEmail } from '../src/checkEmail.js';
import { enviarEmail } from '../src/emailTransporte.js';

const env = { RESEND_API_KEY: 'chave-ficticia-nao-exibir', EMAIL_FROM: 'Power Beef <pedidos@example.com>', APP_URL: 'https://example.com/', EMAIL_ENABLED: 'false' };
test('verificação local não faz requisições nem exibe a chave', async () => {
  const logs=[];await checarEmail([],env,()=>assert.fail('Não pode enviar sem --send'),line=>logs.push(line));
  assert.ok(logs.some(l=>l.includes('Nenhum e-mail enviado')));assert.ok(!logs.join('\n').includes(env.RESEND_API_KEY));
});
test('teste explícito envia mensagem identificada como teste sem alterar pedidos', async () => {
  const logs=[];let payload,key;
  await checarEmail(['--send','meu@email.com'],env,async(m,c,k)=>{payload=m;key=k;assert.equal(c.appUrl,'https://example.com');return 'email-teste';},line=>logs.push(line));
  assert.deepEqual(payload.to,['meu@email.com']);assert.match(payload.subject,/teste de configuração/);assert.match(payload.text,/nenhum pedido foi criado/);assert.match(key,/^teste-configuracao\//);assert.ok(logs.some(l=>l.includes('email-teste')));
});
test('exige parâmetros explícitos e configuração válida antes de tentar enviar', async () => {
  for(const args of [['--send'],['--send','invalido'],['meu@email.com'],['--send','a@example.com','b@example.com'],['--outro']])await assert.rejects(checarEmail(args,env,()=>assert.fail('Não deve enviar'),()=>{}));
  for(const config of [{...env,RESEND_API_KEY:''},{...env,EMAIL_FROM:'invalido'},{...env,APP_URL:'http://example.com'},{...env,APP_URL:'https://example.com/pedidos'},{...env,EMAIL_REPLY_TO:'invalido'}])assert.throws(()=>configurarEmail(config));
});
test('transporta reply-to e oferece diagnóstico seguro para erros de autenticação e cota', async () => {
  const config=configurarEmail({...env,EMAIL_REPLY_TO:'contato@example.com'});
  await enviarEmail({to:['cliente@example.com'],subject:'Teste',text:'Teste'},config,'teste-1',async(url,opts)=>{
    const payload=JSON.parse(opts.body);assert.equal(payload.reply_to,'contato@example.com');return {ok:true,json:async()=>({id:'id-1'})};
  });
  for(const status of [401,403,429,500])await assert.rejects(enviarEmail({to:['cliente@example.com'],subject:'Teste',text:'Teste'},config,'teste-2',async()=>({ok:false,status})),error=>error.status===status&&!error.message.includes(env.RESEND_API_KEY));
});
