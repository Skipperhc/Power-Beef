const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const falha = message => Object.assign(new Error(message), { status: 400 });
export function validarEntrega(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados) || Object.keys(dados).some(k => !['nome', 'whatsapp', 'endereco', 'referencia'].includes(k))) throw falha('Informe os dados de entrega.');
  const texto = (campo, min, max) => {
    if (typeof dados[campo] !== 'string') throw falha('Informe nome e endereço para entrega.');
    const valor = dados[campo].trim().replace(/[\r\n\t]+/g, ' ');
    if (valor.length < min || valor.length > max || /[\u0000-\u001f\u007f]/.test(valor)) throw falha(campo === 'nome' ? 'Informe um nome de 3 a 100 caracteres.' : 'Informe o endereço completo, de 10 a 500 caracteres.');
    return valor;
  };
  const nome = texto('nome', 3, 100), endereco = texto('endereco', 10, 500);
  if (typeof dados.whatsapp !== 'string' || !/^[+\d\s().-]{10,25}$/.test(dados.whatsapp)) throw falha('Informe um WhatsApp válido com DDD.');
  let whatsapp = dados.whatsapp.replace(/\D/g, '');
  if (whatsapp.length === 13 && whatsapp.startsWith('55')) whatsapp = whatsapp.slice(2);
  if (!/^\d{2}9\d{8}$/.test(whatsapp) || !ddds.has(whatsapp.slice(0, 2)) || /^(\d)\1{8}$/.test(whatsapp.slice(2))) throw falha('Informe um celular brasileiro válido com DDD e nove dígitos.');
  if (dados.referencia !== undefined && (typeof dados.referencia !== 'string' || dados.referencia.length > 200 || /[\u0000-\u001f\u007f]/.test(dados.referencia))) throw falha('A referência deve ter até 200 caracteres.');
  return { nome, whatsapp: '55' + whatsapp, endereco, referencia: dados.referencia?.trim() ?? '' };
}
