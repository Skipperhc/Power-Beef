import { filtrar, valoresUnicos } from './filtros';

describe('Filtros por coluna', () => {
  const linhas = [
    { tipo: 'original', lote: 'LÓTE-A', status: 'vendido', dataVenda: '2026-11-13T00:00:00.000Z', quantidade: 2 },
    { tipo: 'picante', lote: 'Lote-B', status: 'em_estoque', dataVenda: null, quantidade: 1 },
    { tipo: 'original', lote: 'Outro', status: 'vendido', dataVenda: '2026-11-14T00:00:00.000Z', quantidade: 2 },
  ];
  it('combina texto sem acentos, seleção exata e intervalo inclusivo', () => {
    expect(filtrar(linhas, { tipo: { valor: 'original' }, lote: { valor: 'lote-a' }, dataVenda: { inicio: '2026-11-13', fim: '2026-11-13' } }, ['tipo'])).toEqual([linhas[0]]);
  });
  it('aceita apenas um limite e exclui datas ausentes quando filtradas', () => {
    expect(filtrar(linhas, { dataVenda: { inicio: '2026-11-14' } })).toEqual([linhas[2]]);
    expect(filtrar(linhas, { dataVenda: { fim: '2026-11-13' } })).toEqual([linhas[0]]);
    expect(filtrar(linhas, {})).toEqual(linhas);
  });
  it('retorna vazio para intervalo invertido e valores não encontrados', () => {
    expect(filtrar(linhas, { dataVenda: { inicio: '2026-11-14', fim: '2026-11-13' } })).toEqual([]);
    expect(filtrar(linhas, { lote: { valor: 'inexistente' } })).toEqual([]);
  });
  it('seleciona quantidades exatas e gera opções únicas', () => {
    expect(filtrar(linhas, { quantidade: { valor: '2' } }, ['quantidade'])).toEqual([linhas[0], linhas[2]]);
    expect(valoresUnicos(linhas, 'quantidade')).toEqual(['1', '2']);
    expect(valoresUnicos(linhas, 'tipo')).toEqual(['original', 'picante']);
  });
});
