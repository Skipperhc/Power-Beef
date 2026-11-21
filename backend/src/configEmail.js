export function configurarEmail(env = process.env) {
  const apiKey = env.RESEND_API_KEY?.trim(), from = env.EMAIL_FROM?.trim(), replyTo = env.EMAIL_REPLY_TO?.trim();
  if (!apiKey || !from || !env.APP_URL) throw new Error('Configure RESEND_API_KEY, EMAIL_FROM e APP_URL no .env do backend.');
  const email = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
  const remetente = from.match(/^[^<>\r\n]+<([^<>]+)>$/)?.[1] ?? from;
  if (!email.test(remetente) || /[\r\n]/.test(from)) throw new Error('EMAIL_FROM deve ser um e-mail válido, como Power Beef <pedidos@powerbeefcwb.com.br>.');
  if (replyTo && !email.test(replyTo)) throw new Error('EMAIL_REPLY_TO deve conter um e-mail válido.');
  let url;
  try { url = new URL(env.APP_URL); } catch { throw new Error('APP_URL deve ser a origem HTTPS do site.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL deve conter somente a origem HTTPS, sem caminhos, como https://powerbeefcwb.com.br.');
  return { apiKey, from, appUrl: url.origin, ...(replyTo ? { replyTo } : {}) };
}
