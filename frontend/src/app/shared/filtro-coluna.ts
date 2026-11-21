import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltroColuna } from './filtros';

@Component({
  selector: 'app-filtro-coluna',
  imports: [FormsModule],
  template: `
    @if (tipo === 'data') {
      <div class="intervalo-datas">
        <label>Data início<input type="date" [attr.aria-label]="titulo + ': data inicial'" [ngModel]="filtro.inicio || ''" (ngModelChange)="alterar('inicio', $event)"></label>
        <label>Data fim<input type="date" [attr.aria-label]="titulo + ': data final'" [ngModel]="filtro.fim || ''" (ngModelChange)="alterar('fim', $event)"></label>
      </div>
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
  styles: `:host { display:block; margin-top:10px; min-width:0; } input,select { width:100%; min-width:0; min-height:44px; box-sizing:border-box; border:1px solid #d8ccbc; border-radius:8px; background:white; padding:10px 12px; font:inherit; font-size:14px; color:#393229; } .intervalo-datas { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } label { display:flex; flex-direction:column; gap:7px; min-width:0; font-size:12px; color:#796b5b; font-weight:normal; margin:0; } small { display:block; color:#9a2923; margin-top:6px; } :focus-visible { outline:2px solid #c76a22; outline-offset:2px; } @media(max-width:560px){input,select{font-size:16px;padding:10px 6px}.intervalo-datas{gap:10px}}`,
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
