import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { finalize, map } from 'rxjs';
import { FiltroColunaComponent } from '../shared/filtro-coluna';
import { filtrar, valoresUnicos, Filtros, FiltroColuna } from '../shared/filtros';
import { Paginacao } from '../shared/paginacao';
import { Paginador } from '../shared/paginador';

interface DadosPacote {
  tipo: string; dataFabricacao: string; validade: string;
  lote: string; status: string; observacoes: string;
}
interface Pacote extends DadosPacote { _id: string; createdAt: string; updatedAt: string; dataVenda?: string | null; pedido?: string | null; }

@Component({ imports: [FormsModule, DatePipe, FiltroColunaComponent, Paginador], selector: 'app-pacotes', styleUrl: '../app.scss', templateUrl: './pacotes.html' })
export class Pacotes {
  @ViewChild('form') formulario?: NgForm;
  private readonly http = inject(HttpClient);
  readonly sabores = ['brasileirinho', 'picante', 'churrasco', 'original'];
  readonly estados = [ { valor: 'em_estoque', nome: 'Em estoque' }, { valor: 'vendido', nome: 'Vendido' }, { valor: 'descartado', nome: 'Descartado' } ];
  readonly pacotes = signal<Pacote[]>([]);
  readonly filtros = signal<Filtros>({});
  readonly filtrados = computed(() => filtrar(this.pacotes(), this.filtros(), ['tipo', 'status']));
  readonly paginacao = new Paginacao(() => this.filtrados());
  limparFiltros() { this.filtros.set({}); this.paginacao.primeira(); }
  readonly tiposUnicos = computed(() => valoresUnicos(this.pacotes(), 'tipo'));
  readonly statusUnicos = computed(() => valoresUnicos(this.pacotes(), 'status'));
  readonly rotulosStatus = { em_estoque: 'Em estoque', reservado: 'Reservado para pedido', vendido: 'Vendido', descartado: 'Descartado' };
  filtrarColuna(campo: string, filtro: FiltroColuna) { this.filtros.update(filtros => ({ ...filtros, [campo]: filtro })); this.paginacao.primeira(); }
  readonly carregando = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly editarId = signal('');
  readonly confirmar = signal<Pacote | null>(null);
  readonly estoque = computed(() => this.pacotes().filter(p => p.status === 'em_estoque').length);
  dados = this.vazio();
  quantidade = 1;
  venda = { tipo: '', quantidade: 1, dataVenda: '' };
  disponivelVenda() { return this.pacotes().filter(p => p.tipo === this.venda.tipo && p.status === 'em_estoque').length; }
  vendaValida() { return Number.isInteger(this.venda.quantidade) && this.venda.quantidade >= 1 && this.venda.quantidade <= 1000; }
  registrarVenda(form: NgForm) {
    if (form.invalid || !this.vendaValida() || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.http.post<{ quantidade: number; dataVenda: string; ids: string[] }>('/api/pacotes/venda', this.venda)
      .pipe(finalize(() => this.ocupado.set(false))).subscribe({
        next: resultado => {
          const ids = new Set(resultado.ids);
          this.pacotes.update(lista => lista.map(p => ids.has(p._id) ? { ...p, status: 'vendido', dataVenda: resultado.dataVenda } : p));
          this.aviso.set(`${resultado.quantidade} pacote(s) marcado(s) como vendido(s).`);
          this.venda = { tipo: '', quantidade: 1, dataVenda: '' };
          form.resetForm({ tipoVenda: '', quantidadeVenda: 1, dataVenda: '' });
        }, error: e => this.falha(e),
      });
  }
  constructor() { this.carregar(); }
  private vazio(): DadosPacote { return { tipo: '', dataFabricacao: '', validade: '', lote: '', status: 'em_estoque', observacoes: '' }; }
  carregar() {
    this.carregando.set(true); this.erro.set('');
    this.http.get<Pacote[]>('/api/pacotes').pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: pacotes => this.pacotes.set(pacotes), error: e => this.falha(e),
    });
  }
  salvar(form: NgForm) {
    if (form.invalid || this.datasInvalidas() || this.ocupado() || (!this.editarId() && !this.quantidadeValida())) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    const id = this.editarId();
    const requisicao = id
      ? this.http.put<Pacote>(`/api/pacotes/${id}`, this.dados).pipe(map(pacote => [pacote]))
      : this.http.post<{ quantidade: number; pacotes: Pacote[] }>('/api/pacotes', { ...this.dados, quantidade: this.quantidade }).pipe(map(resposta => resposta.pacotes));
    requisicao.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: pacotes => {
        this.pacotes.update(lista => id ? lista.map(p => p._id === id ? pacotes[0] : p) : [...pacotes, ...lista]);
        this.cancelar(form); this.aviso.set(id ? 'Pacote atualizado.' : `${pacotes.length} pacote(s) adicionado(s) ao lote.`);
        if (id) this.carregar();
      }, error: e => this.falha(e),
    });
  }
  editar(pacote: Pacote, form = this.formulario) {
    this.editarId.set(pacote._id);
    this.dados = { tipo: pacote.tipo, dataFabricacao: pacote.dataFabricacao.slice(0, 10), validade: pacote.validade.slice(0, 10), lote: pacote.lote, status: pacote.status, observacoes: pacote.observacoes };
    form?.resetForm(this.dados); this.erro.set(''); this.aviso.set('');
    document.getElementById('tipo')?.focus();
  }
  cancelar(form = this.formulario) { this.editarId.set(''); this.dados = this.vazio(); this.quantidade = 1; form?.resetForm({ ...this.dados, quantidade: 1 }); }
  quantidadeValida() { return Number.isInteger(this.quantidade) && this.quantidade >= 1 && this.quantidade <= 1000; }
  excluir(form = this.formulario) {
    const pacote = this.confirmar();
    if (!pacote || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.http.delete<void>(`/api/pacotes/${pacote._id}`).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: () => {
        this.pacotes.update(lista => lista.filter(p => p._id !== pacote._id));
        if (this.editarId() === pacote._id) this.cancelar(form);
        this.confirmar.set(null); this.aviso.set('Pacote excluído.');
      }, error: e => { this.confirmar.set(null); this.falha(e); },
    });
  }
  datasInvalidas() { return !!this.dados.validade && this.dados.validade < this.dados.dataFabricacao; }
  nomeStatus(valor: string) { return valor === 'reservado' ? 'Reservado para pedido' : this.estados.find(e => e.valor === valor)?.nome ?? valor; }
  private falha(e: HttpErrorResponse) {
    const detalhes = e.error?.errors ? Object.values(e.error.errors).join(' ') : '';
    this.erro.set(detalhes || e.error?.message || 'Não foi possível acessar a API. Verifique se o backend está iniciado.');
  }
}

