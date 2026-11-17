import { PROMOCOES, calcularCarrinho } from './promocoes';
describe('Promoções Power Beef', () => {
  it('calcula descontos usando R$ 19,90 como referência e R$ 14,90 por unidade a partir de 25', () => {
    expect(PROMOCOES.map(p => p.precoCentavos)).toEqual([1990, 6990, 15990, 1490]);
    expect(PROMOCOES.map(p => p.desconto)).toEqual([0, 12.2, 19.6, 25.1]);
    expect(PROMOCOES.map(p => p.porUnidade)).toEqual([false, false, false, true]);
  });
  it('combina ofertas para quantidades intermediárias e aplica preço unitário a partir de 25', () => {
    for (const [quantidade, total] of [[0, 0], [1, 1990], [4, 6990], [5, 8980], [8, 13980], [10, 15990], [12, 19970], [14, 22980], [24, 38970], [25, 37250], [26, 38740], [100, 149000], [4000, 5960000]]) {
      const preco = calcularCarrinho(quantidade);
      expect(preco.totalCentavos).toBe(total);
      expect(preco.combinacoes.reduce((s, c) => s + c.pacotes * c.repeticoes, 0)).toBe(quantidade);
      expect(preco.combinacoes.reduce((s, c) => s + c.totalCentavos, 0)).toBe(total);
      expect(preco.descontoCentavos + preco.totalCentavos).toBe(preco.subtotalCentavos);
    }
    expect(calcularCarrinho(14).combinacoes.map(c => c.pacotes)).toEqual([10, 4]);
    expect(calcularCarrinho(25).descontoPercentual).toBe(25.1);
  });
  it('não aceita quantidades fracionadas ou fora do limite do carrinho', () => {
    for (const quantidade of [-1, 1.5, NaN, Infinity, 4001]) expect(() => calcularCarrinho(quantidade)).toThrow();
  });
});
