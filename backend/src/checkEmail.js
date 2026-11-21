import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { configurarEmail } from './configEmail.js';
import { enviarEmail } from './emailTransporte.js';

export async function checarEmail(args = [], env = process.env, enviar = enviarEmail, log = console.log) {
  const enviarTeste = args.includes('--send'), destinatarios = args.filter(arg => arg !== '--send');
  if (destinatarios.length > 1 || destinatarios.some(arg => arg.startsWith('--'))) throw new Error('Uso: npm run email:check [-- --send seu@email.com]');
  const config = configurarEmail(env);
  if (!enviarTeste && destinatarios.length) throw new Error('Para enviar um teste, informe --send antes do destinatário.');
  if (enviarTeste && (!destinatarios[0] || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(destinatarios[0]))) throw new Error('Informe seu e-mail de teste: npm run email:check -- --send seu@email.com');
  log('Configuração de e-mail válida. Chave de API: configurada (valor oculto).');
  log(`Envio automático: ${env.EMAIL_ENABLED === 'true' ? 'ativado' : 'desativado'}.`);
  if (!enviarTeste) { log('Nenhum e-mail enviado. Para testar, aguarde o domínio Verified e execute: npm run email:check -- --send seu@email.com'); return; }
  const id = await enviar({
    to: [destinatarios[0]], subject: 'Power Beef: teste de configuração de e-mail',
    text: `O envio de e-mails da Power Beef está funcionando.\n\nEste é apenas um teste de configuração; nenhum pedido foi criado ou alterado.\n\nSite: ${config.appUrl}`,
  }, config, `teste-configuracao/${randomUUID()}`);
  log('Teste aceito pelo Resend. ID: ' + id + '. Confira a caixa de entrada, spam e o painel do provedor.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checarEmail(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
