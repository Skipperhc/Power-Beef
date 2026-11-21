import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarrinhoService, PRODUTOS } from './carrinho.service';
import { formatarPreco } from './promocoes';
import { MenuIcon } from '../menu-icon';

@Component({
  selector: 'app-carrinho-resumo',
  imports: [RouterLink, MenuIcon],
  host: { '[class.menu-aberto]': 'menuAberto' },
  template: `
    <button type="button" class="carrinho-flutuante" aria-label="Abrir resumo do carrinho" aria-haspopup="dialog" aria-controls="resumo-carrinho" (click)="modal.showModal()">
      <app-menu-icon name="cart" /><span class="qtd-flutuante">{{ carrinho.total() }}</span>
    </button>
    <dialog #modal id="resumo-carrinho" aria-labelledby="resumo-carrinho-titulo" (click)="fecharFora($event, modal)">
      <div class="resumo-cabecalho"><div><p>SEU PEDIDO</p><h2 id="resumo-carrinho-titulo">Resumo do carrinho</h2></div><button type="button" class="fechar-resumo" aria-label="Fechar resumo do carrinho" autofocus (click)="modal.close()">×</button></div>
      <p class="resumo-quantidade" aria-live="polite">{{ carrinho.total() }} {{ carrinho.total() === 1 ? 'pacote' : 'pacotes' }} no carrinho</p>
      <div class="sabores-resumo">
        @for (produto of produtos; track produto.tipo) {
          <article class="sabor-resumo" [attr.data-sabor]="produto.tipo" [attr.aria-label]="produto.nome + ': ' + quantidade(produto.tipo) + ' pacotes'">
            <h3>{{ produto.nome }}</h3><div class="sabor-contagem"><span class="sabor-icone" aria-hidden="true">{{ produto.icone }}</span><strong>{{ quantidade(produto.tipo) }}</strong></div>
            <div class="sabor-acoes" [attr.aria-label]="'Alterar quantidade de '+produto.nome">
              <button type="button" (click)="aumentar(produto.tipo)" [disabled]="quantidade(produto.tipo)>=1000" [attr.aria-label]="'Adicionar 1 pacote de '+produto.nome" title="Adicionar 1 pacote"><app-menu-icon name="up" /></button>
              <button type="button" (click)="diminuir(produto.tipo)" [disabled]="!quantidade(produto.tipo)" [attr.aria-label]="'Diminuir 1 pacote de '+produto.nome" title="Diminuir 1 pacote"><app-menu-icon name="down" /></button>
              <button type="button" (click)="carrinho.remover(produto.tipo)" [disabled]="!quantidade(produto.tipo)" [attr.aria-label]="'Remover todos os pacotes de '+produto.nome" title="Remover todos deste sabor"><app-menu-icon name="trash" /></button>
            </div>
          </article>
        }
      </div>
      @if (!carrinho.total()) { <p class="resumo-vazio">Seu carrinho está vazio. Escolha seus sabores favoritos para começar.</p> }
      <div class="resumo-total" aria-live="polite"><div><span>Total do pedido</span><small>Promoções por quantidade já aplicadas</small></div><strong>{{ moeda(carrinho.precos().totalCentavos) }}</strong></div>
      <a class="abrir-carrinho" routerLink="/carrinho" (click)="modal.close()">Ver carrinho completo <span aria-hidden="true">→</span></a>
    </dialog>`,
  styleUrl: './carrinho-resumo.scss',
})
export class CarrinhoResumo {
  @Input() menuAberto = false;
  readonly carrinho = inject(CarrinhoService);
  readonly produtos = PRODUTOS;
  readonly moeda = formatarPreco;
  quantidade(tipo: string) { return this.carrinho.itens().find(item => item.tipo === tipo)?.quantidade ?? 0; }
  aumentar(tipo: string) { this.carrinho.adicionar(tipo, 1); }
  diminuir(tipo: string) {
    const atual = this.quantidade(tipo);
    if (atual <= 0) return;
    if (atual === 1) this.carrinho.remover(tipo);
    else this.carrinho.alterar(tipo, atual - 1);
  }
  fecharFora(event: MouseEvent, modal: HTMLDialogElement) {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
  }
}
