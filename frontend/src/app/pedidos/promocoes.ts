export const PRECO_UNITARIO_CENTAVOS = 1890;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarPreco = (centavos: number) => moeda.format(centavos / 100);
export const PROMOCOES = [
  { quantidade: 1, titulo: '1 pacote', precoCentavos: 1890, porUnidade: false },
  { quantidade: 4, titulo: '4 pacotes', precoCentavos: 6990, porUnidade: false },
  { quantidade: 10, titulo: '10 pacotes', precoCentavos: 15990, porUnidade: false },
  { quantidade: 25, titulo: '25+ pacotes', precoCentavos: 1490, porUnidade: true },
].map(oferta => {
  const total = oferta.porUnidade ? oferta.precoCentavos * oferta.quantidade : oferta.precoCentavos;
  const desconto = Math.round((1 - total / (PRECO_UNITARIO_CENTAVOS * oferta.quantidade)) * 1000) / 10;
  return {
    ...oferta,
    desconto,
    preco: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oferta.precoCentavos / 100),
    percentual: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(desconto),
  };
});

export interface CombinacaoPromocional { pacotes: number; repeticoes: number; precoCentavos: number; totalCentavos: number; descricao: string; }
export function calcularCarrinho(quantidade: number) {
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 4000) throw new Error('Quantidade inválida.');
  const subtotalCentavos = quantidade * PRECO_UNITARIO_CENTAVOS;
  let totalCentavos = 0; const combinacoes: CombinacaoPromocional[] = [];
  const atacado = PROMOCOES.filter(p => p.porUnidade && quantidade >= p.quantidade).sort((a, b) => a.precoCentavos - b.precoCentavos)[0];
  if (atacado) {
    totalCentavos = quantidade * atacado.precoCentavos;
    combinacoes.push({ pacotes: 1, repeticoes: quantidade, precoCentavos: atacado.precoCentavos, totalCentavos, descricao: 'Preço de 25+ pacotes' });
  } else if (quantidade) {
    const ofertas = PROMOCOES.filter(p => !p.porUnidade), valores = Array<number>(quantidade + 1).fill(Infinity), escolhas = Array<number>(quantidade + 1).fill(0);
    valores[0] = 0;
    for (let n = 1; n <= quantidade; n++) for (const oferta of ofertas) {
      if (oferta.quantidade <= n && valores[n - oferta.quantidade] + oferta.precoCentavos < valores[n]) {
        valores[n] = valores[n - oferta.quantidade] + oferta.precoCentavos; escolhas[n] = oferta.quantidade;
      }
    }
    totalCentavos = valores[quantidade]; const grupos = new Map<number, number>();
    for (let n = quantidade; n > 0; n -= escolhas[n]) grupos.set(escolhas[n], (grupos.get(escolhas[n]) || 0) + 1);
    for (const [pacotes, repeticoes] of [...grupos.entries()].sort((a, b) => b[0] - a[0])) {
      const oferta = ofertas.find(p => p.quantidade === pacotes)!;
      combinacoes.push({ pacotes, repeticoes, precoCentavos: oferta.precoCentavos, totalCentavos: oferta.precoCentavos * repeticoes, descricao: pacotes === 1 ? 'Pacote avulso' : `Combo de ${pacotes} pacotes` });
    }
  }
  const descontoCentavos = subtotalCentavos - totalCentavos;
  return { quantidade, subtotalCentavos, totalCentavos, descontoCentavos, descontoPercentual: subtotalCentavos ? Math.round(descontoCentavos / subtotalCentavos * 1000) / 10 : 0, combinacoes };
}
