import { computed, signal } from '@angular/core';

export class Paginacao<T> {
  readonly tamanho = signal(10);
  private readonly solicitada = signal(1);
  readonly total;
  readonly paginas;
  readonly pagina;
  readonly inicio;
  readonly fim;
  readonly itens;

  constructor(linhas: () => T[]) {
    this.total = computed(() => linhas().length);
    this.paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamanho())));
    this.pagina = computed(() => Math.min(this.solicitada(), this.paginas()));
    this.inicio = computed(() => this.total() ? (this.pagina() - 1) * this.tamanho() + 1 : 0);
    this.fim = computed(() => Math.min(this.pagina() * this.tamanho(), this.total()));
    this.itens = computed(() => linhas().slice((this.pagina() - 1) * this.tamanho(), this.pagina() * this.tamanho()));
  }

  ir(pagina: number) { this.solicitada.set(Math.max(1, Math.min(this.paginas(), pagina))); }
  primeira() { this.solicitada.set(1); }
  alterarTamanho(valor: number) {
    if (![10, 25, 50, 100].includes(valor)) return;
    this.tamanho.set(valor); this.primeira();
  }
}
