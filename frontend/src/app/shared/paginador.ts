import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paginacao } from './paginacao';

@Component({
  selector: 'app-paginador',
  imports: [FormsModule],
  template: `
    <nav [attr.aria-label]="'Paginação de ' + titulo">
      <label>Itens por página <select [ngModel]="controle.tamanho()" (ngModelChange)="controle.alterarTamanho($event)" [disabled]="desabilitado">
        @for (tamanho of tamanhos; track tamanho) { <option [ngValue]="tamanho">{{ tamanho }}</option> }
      </select></label>
      <span role="status">{{ controle.inicio() }}–{{ controle.fim() }} de {{ controle.total() }} resultados</span>
      <div>
        <button type="button" (click)="controle.primeira()" [disabled]="desabilitado || controle.pagina() === 1" aria-label="Primeira página">«</button>
        <button type="button" (click)="controle.ir(controle.pagina() - 1)" [disabled]="desabilitado || controle.pagina() === 1">Anterior</button>
        <span>Página {{ controle.pagina() }} de {{ controle.paginas() }}</span>
        <button type="button" (click)="controle.ir(controle.pagina() + 1)" [disabled]="desabilitado || controle.pagina() === controle.paginas()">Próxima</button>
        <button type="button" (click)="controle.ir(controle.paginas())" [disabled]="desabilitado || controle.pagina() === controle.paginas()" aria-label="Última página">»</button>
      </div>
    </nav>
  `,
  styles: `nav { display:flex; flex-wrap:wrap; align-items:center; gap:16px; justify-content:space-between; padding-top:20px; font:13px Arial,sans-serif; color:#6c665f; } label,div { display:flex; align-items:center; flex-wrap:wrap; gap:8px; } select,button { padding:8px; border:1px solid #d8d1c7; border-radius:6px; background:white; color:#393229; font:inherit; } button { cursor:pointer; } button:disabled { opacity:.45; cursor:default; } :focus-visible { outline:2px solid #c76a22; outline-offset:2px; }`,
})
export class Paginador {
  @Input({ required: true }) controle!: Paginacao<unknown>;
  @Input() titulo = 'resultados';
  @Input() desabilitado = false;
  readonly tamanhos = [10, 25, 50, 100];
}
