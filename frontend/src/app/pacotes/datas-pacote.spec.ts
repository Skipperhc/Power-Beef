import { datasPacote } from './datas-pacote';
describe('Datas automáticas do pacote', () => {
  it('considera São Paulo e ajusta fim de mês e ano bissexto', () => {
    expect(datasPacote(new Date('2026-11-16T02:30:00Z'))).toEqual({ dataFabricacao: '2026-11-15', validade: '2027-02-15' });
    expect(datasPacote(new Date('2026-11-30T12:00:00Z'))).toEqual({ dataFabricacao: '2026-11-30', validade: '2027-02-28' });
    expect(datasPacote(new Date('2023-11-30T12:00:00Z'))).toEqual({ dataFabricacao: '2023-11-30', validade: '2024-02-29' });
  });
});
