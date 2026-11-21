export async function enviarEmail(mensagem, config, chave, fetcher = fetch) {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': chave },
    body: JSON.stringify({ from: config.from, ...mensagem, ...(config.replyTo ? { reply_to: config.replyTo } : {}) }),
  });
  if (!response.ok) {
    const orientacao = response.status === 401 ? 'Confira a chave de API.' : response.status === 403 ? 'Confira o domínio verificado, o remetente e a permissão de envio da chave.' : response.status === 429 ? 'Limite de envio atingido; confira a cota no Resend.' : 'Tente novamente mais tarde.';
    throw Object.assign(new Error(`Envio de e-mail recusado (HTTP ${response.status}). ${orientacao}`), { status: response.status });
  }
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id) throw new Error('Provedor não confirmou o envio.');
  return result.id;
}
