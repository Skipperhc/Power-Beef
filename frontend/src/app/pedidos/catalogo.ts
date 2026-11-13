import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarrinhoService, PRODUTOS } from './carrinho.service';

@Component({ selector: 'app-catalogo', imports: [FormsModule, RouterLink], templateUrl: './catalogo.html', styleUrls: ['../app.scss', './loja.scss'] })
export class Catalogo {
  readonly carrinho = inject(CarrinhoService);
  readonly produtos = PRODUTOS;
  readonly aviso = signal('');
  readonly erro = signal('');
  quantidades: Record<string, number> = Object.fromEntries(PRODUTOS.map(p => [p.tipo, 1]));
  adicionar(tipo: string) {
    this.aviso.set(''); this.erro.set('');
    if (this.carrinho.adicionar(tipo, this.quantidades[tipo])) this.aviso.set(`${this.carrinho.nome(tipo)} adicionado ao carrinho.`);
    else this.erro.set('Informe uma quantidade inteira entre 1 e 1000, respeitando o limite por sabor no carrinho.');
  }
}
