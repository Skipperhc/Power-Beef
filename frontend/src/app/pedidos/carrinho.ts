import { acompanharNotificacoes } from '../shared/notificacoes.service';
﻿import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CarrinhoService } from './carrinho.service';
import { formatarPreco } from './promocoes';
import { AuthService } from '../auth/auth.service';
import { NotificacoesService } from '../shared/notificacoes.service';

@Component({ selector: 'app-carrinho', imports: [FormsModule, RouterLink], templateUrl: './carrinho.html', styleUrls: ['../app.scss', './loja.scss', './carrinho.scss'] })
export class Carrinho {
  readonly carrinho = inject(CarrinhoService);
  readonly auth = inject(AuthService);
  private readonly notificacoes = inject(NotificacoesService);
  remover(tipo: string) { const nome = this.carrinho.nome(tipo); this.carrinho.remover(tipo); this.notificacoes.informacao(`${nome} removido do carrinho.`); }
  entrega = { nome: this.auth.usuario()?.nome ?? '', whatsapp: '', endereco: '', referencia: '' };
  get whatsappValido() {
    if (!/^[+\d\s().-]{10,25}$/.test(this.entrega.whatsapp)) return false;
    const digits = this.entrega.whatsapp.replace(/\D/g, '');
    const celular = digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits;
    return /^\d{2}9\d{8}$/.test(celular) && !/^(\d)\1{8}$/.test(celular.slice(2));
  }
  readonly moeda = formatarPreco;
  percentual(valor: number) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor); }
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly enviando = signal(false);
  readonly erro = signal('');
  private readonly alertas = acompanharNotificacoes(this.erro);
  finalizar(form: NgForm) {
    if (this.enviando() || !this.carrinho.itens().length) return;
    if (!this.auth.usuario()) { void this.router.navigate(['/login'], {queryParams:{retorno:'/carrinho'}}); return; }
    if (form.invalid || !this.whatsappValido || this.entrega.nome.trim().length < 3 || this.entrega.endereco.trim().length < 10 || this.enviando() || !this.carrinho.itens().length) return;
    const dados = this.carrinho.prepararPedido({ ...this.entrega, nome: this.entrega.nome.trim(), endereco: this.entrega.endereco.trim(), referencia: this.entrega.referencia.trim() });
    this.enviando.set(true); this.erro.set('');
    this.http.post<{ _id: string }>('/api/pedidos', dados).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: pedido => { this.carrinho.limpar(dados.chaveEnvio); void this.router.navigate(['/pedidos'], { queryParams: { enviado: pedido._id } }); },
      error: e => this.erro.set(e.error?.message || 'Não foi possível enviar. Seu carrinho foi mantido; tente novamente.'),
    });
  }
}

