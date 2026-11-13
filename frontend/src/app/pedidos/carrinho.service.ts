import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const PRODUTOS = [
  { tipo: 'brasileirinho', nome: 'Brasileirinho', descricao: 'Conheça o Brasileirinho da Power Beef.', detalhe: 'Um dos nossos quatro sabores.' },
  { tipo: 'picante', nome: 'Picante', descricao: 'Para quem gosta de um toque picante.', detalhe: 'Escolha a intensidade do seu momento.' },
  { tipo: 'churrasco', nome: 'Churrasco', descricao: 'O sabor Churrasco em pacotes Power Beef.', detalhe: 'Seu próximo sabor favorito.' },
  { tipo: 'original', nome: 'Original', descricao: 'O sabor original do Power Beef.', detalhe: 'Conheça a nossa versão Original.' },
];
export interface ItemCarrinho { tipo: string; quantidade: number; }
interface Carrinho { chaveEnvio: string; itens: ItemCarrinho[]; }

@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private readonly auth = inject(AuthService);
  private readonly carrinhos = signal<Record<string, Carrinho>>({});
  readonly atual = computed(() => this.carrinhos()[this.auth.usuario()?.id || '']);
  readonly itens = computed(() => this.atual()?.itens ?? []);
  readonly total = computed(() => this.itens().reduce((s, i) => s + i.quantidade, 0));
  constructor() {
    effect(() => {
      const id = this.auth.usuario()?.id;
      if (!id || this.carrinhos()[id]) return;
      let itens: ItemCarrinho[] = []; let chaveEnvio = crypto.randomUUID();
      try {
        const salvo = JSON.parse(localStorage.getItem(`pb_carrinho_${id}`) || 'null');
        if (salvo && Array.isArray(salvo.itens) && salvo.itens.length <= 4 && salvo.itens.every((i: ItemCarrinho) => PRODUTOS.some(p => p.tipo === i.tipo) && Number.isInteger(i.quantidade) && i.quantidade > 0 && i.quantidade <= 1000) && new Set(salvo.itens.map((i: ItemCarrinho) => i.tipo)).size === salvo.itens.length) {
          itens = salvo.itens.map(({ tipo, quantidade }: ItemCarrinho) => ({ tipo, quantidade }));
          if (typeof salvo.chaveEnvio === 'string' && /^[a-f0-9-]{36}$/i.test(salvo.chaveEnvio)) chaveEnvio = salvo.chaveEnvio;
        }
      } catch { /* Um carrinho local inválido é descartado. */ }
      this.carrinhos.update(c => ({ ...c, [id]: { itens, chaveEnvio } }));
    });
  }
  nome(tipo: string) { return PRODUTOS.find(p => p.tipo === tipo)?.nome || tipo; }
  adicionar(tipo: string, quantidade: number) {
    if (!PRODUTOS.some(p => p.tipo === tipo) || !Number.isInteger(quantidade) || quantidade < 1) return false;
    const existente = this.itens().find(i => i.tipo === tipo);
    const total = (existente?.quantidade || 0) + quantidade;
    if (total > 1000) return false;
    this.gravar(existente ? this.itens().map(i => i.tipo === tipo ? { ...i, quantidade: total } : i) : [...this.itens(), { tipo, quantidade }]);
    return true;
  }
  alterar(tipo: string, quantidade: number) {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1000) return;
    this.gravar(this.itens().map(i => i.tipo === tipo ? { ...i, quantidade } : i));
  }
  remover(tipo: string) { this.gravar(this.itens().filter(i => i.tipo !== tipo)); }
  limpar(chave: string) { if (this.atual()?.chaveEnvio === chave) this.gravar([]); }
  private gravar(itens: ItemCarrinho[]) {
    const id = this.auth.usuario()?.id; if (!id) return;
    const carrinho = { itens, chaveEnvio: crypto.randomUUID() };
    this.carrinhos.update(c => ({ ...c, [id]: carrinho }));
    try { localStorage.setItem(`pb_carrinho_${id}`, JSON.stringify(carrinho)); } catch { /* A compra continua com o carrinho em memória. */ }
  }
}
