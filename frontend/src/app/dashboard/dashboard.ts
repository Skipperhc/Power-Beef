import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { FiltroColunaComponent } from '../shared/filtro-coluna';
import { filtrar, valoresUnicos, Filtros, FiltroColuna } from '../shared/filtros';
import { Paginacao } from '../shared/paginacao';
import { Paginador } from '../shared/paginador';

interface PacoteEstoque { tipo: string; status: string; lote?: string; dataVenda?: string | null; }
interface ResumoVenda { chave: string; tipo: string; lote: string; dataVenda: string; quantidade: number; }

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, FiltroColunaComponent, Paginador],
  templateUrl: './dashboard.html',
  styleUrls: ['../app.scss', './dashboard.scss'],
})
export class Dashboard {
  private readonly http = inject(HttpClient);
  private readonly pacotes = signal<PacoteEstoque[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly sabores = computed(() => ['brasileirinho', 'picante', 'churrasco', 'original'].map(tipo => ({
    tipo, quantidade: this.pacotes().filter(p => p.tipo === tipo && p.status === 'em_estoque').length,
  })));
  readonly total = computed(() => this.sabores().reduce((soma, sabor) => soma + sabor.quantidade, 0));
  readonly filtrosVendas = signal<Filtros>({});
  readonly vendas = computed(() => {
    const grupos = new Map<string, ResumoVenda>();
    for (const pacote of this.pacotes()) {
      if (pacote.status !== 'vendido') continue;
      const dataVenda = pacote.dataVenda?.slice(0, 10) ?? '';
      const lote = pacote.lote ?? '';
      const chave = JSON.stringify([dataVenda, pacote.tipo, lote]);
      const grupo = grupos.get(chave);
      if (grupo) grupo.quantidade++;
      else grupos.set(chave, { chave, dataVenda, tipo: pacote.tipo, lote, quantidade: 1 });
    }
    return [...grupos.values()].sort((a, b) => b.dataVenda.localeCompare(a.dataVenda) || a.tipo.localeCompare(b.tipo) || a.lote.localeCompare(b.lote));
  });
  readonly vendasFiltradas = computed(() => filtrar(this.vendas(), this.filtrosVendas(), ['tipo', 'quantidade']));
  readonly paginacaoVendas = new Paginacao(() => this.vendasFiltradas());
  limparFiltrosVendas() { this.filtrosVendas.set({}); this.paginacaoVendas.primeira(); }
  readonly tiposVendidos = computed(() => valoresUnicos(this.vendas(), 'tipo'));
  readonly quantidadesVendidas = computed(() => valoresUnicos(this.vendas(), 'quantidade'));
  readonly totalVendido = computed(() => this.vendasFiltradas().reduce((soma, venda) => soma + venda.quantidade, 0));
  filtrarVenda(campo: string, filtro: FiltroColuna) { this.filtrosVendas.update(filtros => ({ ...filtros, [campo]: filtro })); this.paginacaoVendas.primeira(); }

  constructor() { this.carregar(); }

  carregar() {
    this.carregando.set(true); this.erro.set(false);
    this.http.get<PacoteEstoque[]>('/api/pacotes').pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: pacotes => this.pacotes.set(pacotes),
      error: () => this.erro.set(true),
    });
  }
}
