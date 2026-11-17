export function datasPacote(agora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora).map(p => [p.type, p.value]));
  const ano = Number(partes.year), mes = Number(partes.month), dia = Number(partes.day);
  const destino = new Date(Date.UTC(ano, mes - 1 + 3, 1));
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimoDia));
  return { dataFabricacao: `${partes.year}-${partes.month}-${partes.day}`, validade: destino.toISOString().slice(0, 10) };
}
