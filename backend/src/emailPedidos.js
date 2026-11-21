import { Pedido } from './models/Pedido.js';
import { randomUUID } from 'node:crypto';
import { configurarEmail } from './configEmail.js';
import { enviarEmail } from './emailTransporte.js';

export function textoAceite(pedido, appUrl) {
  const nome = pedido.clienteNome;
  const numero = String(pedido._id).slice(-8).toUpperCase();
  const sabores = { original: 'Original', picante: 'Picante', churrasco: 'Churrasco', brasileirinho: 'Brasileirinho' };
  return {
    subject: `Power Beef: pedido #${numero} aceito!`,
    text: `Olá, ${nome}!\n\nSeu pedido #${numero} foi aceito e os pacotes foram reservados.\n\n${pedido.itens.map(i => `${i.quantidade} × ${sabores[i.tipo] || i.tipo}`).join('\n')}\n\n${pedido.entrega ? `Destinatário: ${pedido.entrega.nome}\nEntrega: ${pedido.entrega.endereco}\n\n` : ''}Acompanhe seu pedido em ${appUrl}/pedidos\n\nA aceitação não confirma pagamento nem horário de entrega.\n\nEquipe Power Beef`,
  };
}
export async function enviarEmailAceite(pedido, config) {
  return enviarEmail({ to: [pedido.clienteEmail], ...textoAceite(pedido, config.appUrl) }, config, `pedido-aceito/${pedido._id}`, config.fetcher);
}
export async function processarEmailAceite({ Pedidos = Pedido, enviar = enviarEmailAceite, config, agora = new Date() }) {
  if (!config) return false;
  const bloqueadoAte = new Date(agora.getTime() + 5 * 60 * 1000), token = randomUUID();
  const pedido = await Pedidos.findOneAndUpdate({
    status: { $ne: 'recusado' }, 'emailAceite.tentativas': { $lt: 5 },
    $or: [
      { 'emailAceite.estado': 'pendente', 'emailAceite.proximaTentativa': { $lte: agora } },
      { 'emailAceite.estado': 'enviando', 'emailAceite.bloqueadoAte': { $lte: agora } },
    ],
  }, { $set: { 'emailAceite.estado': 'enviando', 'emailAceite.bloqueadoAte': bloqueadoAte, 'emailAceite.token': token }, $inc: { 'emailAceite.tentativas': 1 } }, { new: true });
  if (!pedido) return false;
  const filtro = { _id: pedido._id, 'emailAceite.estado': 'enviando', 'emailAceite.token': token };
  try {
    const providerId = await enviar(pedido, config);
    await Pedidos.updateOne(filtro, { $set: { 'emailAceite.estado': 'enviado', 'emailAceite.enviadoEm': new Date(), 'emailAceite.providerId': providerId }, $unset: { 'emailAceite.bloqueadoAte': '', 'emailAceite.token': '' } });
  } catch {
    await Pedidos.updateOne(filtro, { $set: { 'emailAceite.estado': pedido.emailAceite.tentativas >= 5 ? 'falhou' : 'pendente', 'emailAceite.proximaTentativa': new Date(agora.getTime() + 60000 * 2 ** pedido.emailAceite.tentativas) }, $unset: { 'emailAceite.bloqueadoAte': '', 'emailAceite.token': '' } });
    console.warn('Falha no aviso de pedido aceito; nova tentativa agendada ou limite atingido.');
  }
  return true;
}
export function iniciarEmailsPedidos(env = process.env) {
  if (env.EMAIL_ENABLED !== 'true') return () => {};
  let config;
  try { config = configurarEmail(env); } catch (error) { console.warn('E-mails desativados: ' + error.message); return () => {}; }
  let ocupado = false;
  const executar = async () => { if (ocupado) return; ocupado = true; try { await processarEmailAceite({ config }); } catch { console.warn('Não foi possível consultar a fila de e-mails.'); } finally { ocupado = false; } };
  const timer = setInterval(executar, 5000); timer.unref(); void executar();
  return () => clearInterval(timer);
}
