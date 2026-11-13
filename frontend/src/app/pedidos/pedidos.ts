import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Paginacao } from '../shared/paginacao';
import { Paginador } from '../shared/paginador';
import { FiltroColunaComponent } from '../shared/filtro-coluna';
import { Filtros, FiltroColuna, filtrar } from '../shared/filtros';
import { PRODUTOS } from './carrinho.service';

interface Pedido {
  _id: string; clienteNome: string; clienteEmail: string; createdAt: string; status: string;
  itens: { tipo: string; quantidade: number; reservada: number }[];
  historico: { status: string; data: string }[];
}
export const STATUS_PEDIDO: Record<string, string> = { pedido_enviado: 'Pedido enviado', em_producao: 'Em produção', aceito: 'Aceito', entregue: 'Entregue', encerrado: 'Encerrado' };

@Component({ selector: 'app-pedidos', imports: [DatePipe, Paginador, FiltroColunaComponent], templateUrl: './pedidos.html', styleUrls: ['../app.scss', './pedidos.scss'] })
export class Pedidos {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly admin = computed(() => this.auth.usuario()?.perfil === 'administrador');
  readonly enviados = signal<Pedido[]>([]);
  readonly carregando = signal(false);
  readonly alterando = signal('');
  readonly erro = signal('');
  readonly aviso = signal(inject(ActivatedRoute).snapshot.queryParamMap.has('enviado') ? 'Pedido enviado! Acompanhe o status abaixo.' : '');
  readonly rotulos = STATUS_PEDIDO;
  readonly status = Object.keys(STATUS_PEDIDO);
  readonly filtros = signal<Filtros>({});
  readonly filtrados = computed(() => filtrar(this.enviados(), this.filtros(), ['status']));
  readonly paginacao = new Paginacao(() => this.filtrados());
  constructor() { this.carregar(); }
  nome(tipo: string) { return PRODUTOS.find(p => p.tipo === tipo)?.nome || tipo; }
  opcoes(pedido: Pedido) {
    return ({ pedido_enviado: ['aceito', 'em_producao'], em_producao: ['aceito'], aceito: ['entregue'], entregue: ['encerrado'], encerrado: [] } as Record<string, string[]>)[pedido.status] || [];
  }
  filtrar(campo: string, filtro: FiltroColuna) { this.filtros.update(f => ({ ...f, [campo]: filtro })); this.paginacao.primeira(); }
  limpar() { this.filtros.set({}); this.paginacao.primeira(); }
  carregar() {
    this.carregando.set(true); this.erro.set('');
    this.http.get<Pedido[]>('/api/pedidos').pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: pedidos => this.enviados.set(pedidos), error: e => this.erro.set(e.error?.message || 'Não foi possível carregar os pedidos.'),
    });
  }
  alterar(pedido: Pedido, status: string) {
    if (this.alterando() || !this.admin()) return;
    if (!window.confirm(`Alterar pedido para ${this.rotulos[status]}? ${status === 'aceito' || status === 'em_producao' ? 'Os pacotes disponíveis serão reservados no estoque.' : ''}`)) return;
    this.alterando.set(pedido._id); this.erro.set(''); this.aviso.set('');
    this.http.put<Pedido>(`/api/pedidos/${pedido._id}`, { status }).pipe(finalize(() => this.alterando.set(''))).subscribe({
      next: atualizado => { this.aviso.set(`Pedido atualizado para ${this.rotulos[atualizado.status]}.`); this.carregar(); },
      error: e => this.erro.set(e.error?.message || 'Não foi possível atualizar o pedido.'),
    });
  }
}
