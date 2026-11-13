import { signal } from '@angular/core';
import { Paginacao } from './paginacao';

describe('Paginação das listagens', () => {
  it('divide resultados e limita a navegação', () => {
    const linhas = signal(Array.from({ length: 26 }, (_, i) => i));
    const controle = new Paginacao(linhas);
    expect(controle.itens()).toEqual(linhas().slice(0, 10));
    expect(controle.paginas()).toBe(3);
    controle.ir(3);
    expect(controle.itens()).toEqual([20, 21, 22, 23, 24, 25]);
    expect(controle.inicio()).toBe(21);
    expect(controle.fim()).toBe(26);
    controle.ir(100);
    expect(controle.pagina()).toBe(3);
    controle.ir(-1);
    expect(controle.pagina()).toBe(1);
  });
  it('ajusta a página quando resultados diminuem e aceita lista vazia', () => {
    const linhas = signal(Array.from({ length: 11 }, (_, i) => i));
    const controle = new Paginacao(linhas);
    controle.ir(2);
    linhas.set(linhas().slice(0, 10));
    expect(controle.pagina()).toBe(1);
    expect(controle.itens().length).toBe(10);
    linhas.set([]);
    expect(controle.itens()).toEqual([]);
    expect(controle.inicio()).toBe(0);
    expect(controle.fim()).toBe(0);
  });
  it('volta ao início ao mudar tamanho ou limpar a página', () => {
    const controle = new Paginacao(() => Array.from({ length: 60 }, (_, i) => i));
    controle.ir(4);
    controle.alterarTamanho(25);
    expect(controle.pagina()).toBe(1);
    expect(controle.itens().length).toBe(25);
    controle.ir(3); controle.primeira();
    expect(controle.pagina()).toBe(1);
    controle.alterarTamanho(0);
    expect(controle.tamanho()).toBe(25);
  });
});
