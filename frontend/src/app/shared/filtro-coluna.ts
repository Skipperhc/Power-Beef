import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltroColuna } from './filtros';

@Component({
  selector: 'app-filtro-coluna',
  imports: [FormsModule],
  template: `
    @if (tipo === 'data') {
      <label>De<input type="date" [attr.aria-label]="titulo + ': data inicial'" [ngModel]="filtro.inicio || ''" (ngModelChange)="alterar('inicio', $event)"></label>
      <label>Até<input type="date" [attr.aria-label]="titulo + ': data final'" [ngModel]="filtro.fim || ''" (ngModelChange)="alterar('fim', $event)"></label>
      @if (filtro.inicio && filtro.fim && filtro.inicio > filtro.fim) { <small role="alert">Intervalo invertido</small> }
    } @else if (tipo === 'selecao') {
      <select [attr.aria-label]="'Filtrar ' + titulo" [ngModel]="filtro.valor || ''" (ngModelChange)="alterar('valor', $event)">
        <option value="">Todos</option>
        @for (opcao of opcoes; track opcao) { <option [value]="opcao">{{ rotulos[opcao] || opcao }}</option> }
      </select>
    } @else {
      <input type="search" [attr.aria-label]="'Filtrar ' + titulo" [placeholder]="titulo" [ngModel]="filtro.valor || ''" (ngModelChange)="alterar('valor', $event)">
    }
  `,
  styles: `:host { display:block; margin-top:8px; min-width:125px; } input,select { width:100%; box-sizing:border-box; border:1px solid #c8c2b8; border-radius:5px; background:white; padding:7px; font:inherit; font-size:12px; color:#393229; } label { display:block; font-size:11px; font-weight:normal; margin-top:5px; } small { color:#9a2923; } :focus-visible { outline:2px solid #c76a22; outline-offset:2px; }`,
})
export class FiltroColunaComponent {
  @Input() titulo = '';
  @Input() tipo: 'texto' | 'data' | 'selecao' = 'texto';
  @Input() filtro: FiltroColuna = {};
  @Input() opcoes: string[] = [];
  @Input() rotulos: Record<string, string> = {};
  @Output() filtroChange = new EventEmitter<FiltroColuna>();
  alterar(campo: keyof FiltroColuna, valor: string) { this.filtroChange.emit({ ...this.filtro, [campo]: valor }); }
}
