import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { calcularCarrinho } from './promocoes';
import { NotificacoesService } from '../shared/notificacoes.service';

export const PRODUTOS = [
  { tipo: 'brasileirinho', nome: 'Brasileirinho', descricao: 'A combinação de alho e cebola no seu Power Beef.', detalhe: 'Alho e cebola', icone: '🧄 🧅', peso: 30, proteina: 13 },
  { tipo: 'picante', nome: 'Picante', descricao: 'Um toque de pimenta com picância suave.', detalhe: 'Picância suave', icone: '🌶️', peso: 30, proteina: 13 },
  { tipo: 'churrasco', nome: 'Churrasco', descricao: 'O sabor defumado para quem gosta de churrasco.', detalhe: 'Defumado', icone: '🔥', peso: 30, proteina: 13 },
  { tipo: 'original', nome: 'Original', descricao: 'O clássico tempero de sal e vinagre.', detalhe: 'Sal e vinagre', icone: '🧂 🍶', peso: 30, proteina: 13 },
];
export interface ItemCarrinho { tipo: string; quantidade: number; }
interface Carrinho { chaveEnvio: string; itens: ItemCarrinho[]; visitanteImportado?: string; }
const visitante = '__visitante__';
const chaveVisitante = 'pb_carrinho_visitante';
const duracaoVisitante = 30 * 24 * 60 * 60 * 1000;
const chaveValida = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s);
export interface EntregaPedido { nome: string; whatsapp: string; endereco: string; referencia: string; }

@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private ultimaEntrega = '';
  private readonly pendentes = new Set<string>();
  private readonly auth = inject(AuthService);
  private readonly notificacoes = inject(NotificacoesService);
  private readonly carrinhos = signal<Record<string, Carrinho>>({});
  readonly atual = computed(() => this.carrinhos()[this.auth.usuario()?.id || visitante]);
  readonly itens = computed(() => this.atual()?.itens ?? []);
  readonly total = computed(() => this.itens().reduce((s, i) => s + i.quantidade, 0));
  readonly precos = computed(() => calcularCarrinho(this.total()));
  constructor() {
    this.sincronizar();
    effect(() => {
      this.auth.usuario();
      untracked(() => this.sincronizar());
    });
  }
  private carregar(id: string): Carrinho {
    const existente = this.carrinhos()[id]; if (existente) return existente;
    let carrinho: Carrinho = { itens: [], chaveEnvio: crypto.randomUUID() };
    try {
      const salvo = JSON.parse(localStorage.getItem(id === visitante ? chaveVisitante : `pb_carrinho_${id}`) || 'null');
      const valido = salvo && (id !== visitante || (Number.isFinite(salvo.expiraEm) && salvo.expiraEm > Date.now())) && Array.isArray(salvo.itens) && salvo.itens.length <= 4 && salvo.itens.every((i: ItemCarrinho) => i && PRODUTOS.some(p => p.tipo === i.tipo) && Number.isInteger(i.quantidade) && i.quantidade > 0 && i.quantidade <= 1000) && new Set(salvo.itens.map((i: ItemCarrinho) => i.tipo)).size === salvo.itens.length;
      if (valido) carrinho = { itens: salvo.itens.map(({tipo,quantidade}: ItemCarrinho) => ({tipo,quantidade})), chaveEnvio: chaveValida(salvo.chaveEnvio) ? salvo.chaveEnvio : carrinho.chaveEnvio, ...(chaveValida(salvo.visitanteImportado) ? {visitanteImportado:salvo.visitanteImportado} : {}) };
    } catch { /* Armazenamento indisponível ou inválido: continua em memória. */ }
    this.carrinhos.update(c => ({...c,[id]:carrinho})); return carrinho;
  }
  private persistir(id: string, carrinho: Carrinho) {
    try { localStorage.setItem(id === visitante ? chaveVisitante : `pb_carrinho_${id}`, JSON.stringify({...carrinho,...(id === visitante ? {expiraEm:Date.now()+duracaoVisitante} : {})})); return true; }
    catch { this.notificacoes.informacao('Não foi possível salvar o carrinho neste navegador. Mantenha a página aberta para continuar sua compra.'); return false; }
  }
  private sincronizar() {
    const convidado = this.carregar(visitante), id = this.auth.usuario()?.id;
    if (!id) return;
    const conta = this.carregar(id);
    if (!convidado.itens.length) return;
    if (conta.visitanteImportado !== convidado.chaveEnvio) {
      let excesso = false;
      const itens = PRODUTOS.map(p => {
        const quantidade = (conta.itens.find(i => i.tipo === p.tipo)?.quantidade || 0) + (convidado.itens.find(i => i.tipo === p.tipo)?.quantidade || 0);
        if (quantidade > 1000) excesso = true;
        return {tipo:p.tipo,quantidade:Math.min(1000,quantidade)};
      }).filter(i => i.quantidade > 0);
      const combinado = {itens,chaveEnvio:crypto.randomUUID(),visitanteImportado:convidado.chaveEnvio};
      this.carrinhos.update(c => ({...c,[id]:combinado}));
      if (!this.persistir(id,combinado)) { this.pendentes.add(id); return; }
      this.pendentes.delete(id);
      if (excesso) this.notificacoes.informacao('Seu carrinho foi combinado com o da conta. Algumas quantidades foram ajustadas ao limite de 1.000 pacotes por sabor; confira antes de enviar.');
    }
    if (this.pendentes.has(id)) { if (!this.persistir(id,this.carregar(id))) return; this.pendentes.delete(id); }
    const vazio = {itens:[],chaveEnvio:crypto.randomUUID()};
    this.carrinhos.update(c => ({...c,[visitante]:vazio}));
    try { localStorage.removeItem(chaveVisitante); } catch { /* O marcador na conta evita importar o mesmo carrinho duas vezes. */ }
  }
  nome(tipo: string) { return PRODUTOS.find(p => p.tipo === tipo)?.nome || tipo; }
  prepararPedido(entrega: EntregaPedido) {
    this.sincronizar();
    if (!this.auth.usuario()) throw new Error('Entre na sua conta para finalizar o pedido.');
    const assinatura = JSON.stringify([this.auth.usuario()?.id, entrega]);
    if (this.ultimaEntrega && this.ultimaEntrega !== assinatura) this.gravar(this.itens());
    this.ultimaEntrega = assinatura;
    return { chaveEnvio: this.atual()!.chaveEnvio, itens: this.itens(), entrega };
  }
  adicionar(tipo: string, quantidade: number) {
    this.sincronizar();
    if (!PRODUTOS.some(p => p.tipo === tipo) || !Number.isInteger(quantidade) || quantidade < 1) return false;
    const existente = this.itens().find(i => i.tipo === tipo);
    const total = (existente?.quantidade || 0) + quantidade;
    if (total > 1000) return false;
    this.gravar(existente ? this.itens().map(i => i.tipo === tipo ? { ...i, quantidade: total } : i) : [...this.itens(), { tipo, quantidade }]);
    return true;
  }
  alterar(tipo: string, quantidade: number) {
    this.sincronizar();
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1000) return;
    this.gravar(this.itens().map(i => i.tipo === tipo ? { ...i, quantidade } : i));
  }
  remover(tipo: string) { this.sincronizar(); this.gravar(this.itens().filter(i => i.tipo !== tipo)); }
  limpar(chave: string) { this.sincronizar(); if (this.atual()?.chaveEnvio === chave) this.gravar([]); }
  private gravar(itens: ItemCarrinho[]) {
    const id = this.auth.usuario()?.id || visitante;
    const carrinho = { ...this.carregar(id), itens, chaveEnvio: crypto.randomUUID() };
    this.carrinhos.update(c => ({ ...c, [id]: carrinho }));
    this.persistir(id,carrinho);
  }
}
