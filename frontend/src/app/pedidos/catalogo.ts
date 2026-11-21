import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarrinhoService, PRODUTOS } from './carrinho.service';
import { PROMOCOES, PRECO_UNITARIO_CENTAVOS, formatarPreco } from './promocoes';
import { MenuIcon } from '../menu-icon';
import { NotificacoesService } from '../shared/notificacoes.service';

@Component({ selector: 'app-catalogo', imports: [FormsModule, RouterLink, MenuIcon], templateUrl: './catalogo.html', styleUrls: ['../app.scss', './loja.scss', './catalogo.scss'] })
export class Catalogo {
  readonly carrinho = inject(CarrinhoService);
  private readonly notificacoes = inject(NotificacoesService);
  readonly produtos = PRODUTOS;
  readonly promocoes = PROMOCOES;
  readonly precoReferencia = formatarPreco(PRECO_UNITARIO_CENTAVOS);
  readonly aviso = signal('');
  readonly erro = signal('');
  quantidades: Record<string, number> = Object.fromEntries(PRODUTOS.map(p => [p.tipo, 1]));
  adicionar(tipo: string) {
    this.aviso.set(''); this.erro.set('');
    const quantidade = this.quantidades[tipo];
    if (this.carrinho.adicionar(tipo, quantidade)) {
      const mensagem = `${quantidade} ${quantidade === 1 ? 'pacote' : 'pacotes'} de ${this.carrinho.nome(tipo)} ${quantidade === 1 ? 'adicionado' : 'adicionados'} ao carrinho.`;
      this.aviso.set(mensagem); this.notificacoes.sucesso(mensagem);
    } else {
      const mensagem = 'Informe uma quantidade inteira entre 1 e 1000, respeitando o limite por sabor no carrinho.';
      this.erro.set(mensagem); this.notificacoes.erro(mensagem);
    }
  }
}
