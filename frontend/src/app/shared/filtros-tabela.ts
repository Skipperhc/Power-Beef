import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FiltroColunaComponent } from './filtro-coluna';
import { FiltroColuna, Filtros } from './filtros';

export interface CampoFiltro { campo: string; titulo: string; tipo?: string; opcoes?: string[]; rotulos?: Record<string,string>; visivel?: boolean; }
@Component({
  selector:'app-filtros-tabela', imports:[FiltroColunaComponent],
  template:`
    <div class="barra-filtros"><button type="button" class="abrir-filtros" (click)="abrir(modal)" aria-haspopup="dialog">☷ Filtros @if (ativos.length) { <span>{{ativos.length}}</span> }</button>
      @if (ativos.length) { <button type="button" class="limpar-todos" (click)="aplicados.emit({})">Limpar filtros</button> }
    </div>
    @if (ativos.length) {
      <ul class="filtros-aplicados" aria-label="Filtros aplicados">
        @for (campo of ativos; track campo.campo) { <li><button type="button" (click)="remover(campo.campo)" [attr.aria-label]="'Remover filtro '+campo.titulo"><span><strong>{{campo.titulo}}:</strong> {{descricao(campo)}}</span><span aria-hidden="true">×</span></button></li> }
      </ul>
    }
    <dialog #modal [attr.aria-label]="'Filtros de '+titulo" (click)="fecharFora($event,modal)">
      <form (submit)="aplicar($event,modal)">
        <header><div><p>PERSONALIZE A LISTAGEM</p><h2>Filtros de {{titulo}}</h2></div><button type="button" class="fechar" aria-label="Fechar filtros" (click)="modal.close()">×</button></header>
        <p class="orientacao">Escolha os critérios e aplique para atualizar a tabela.</p>
        <div class="campos-filtros">@for (campo of visiveis; track campo.campo) {
          <fieldset [class.campo-data]="campo.tipo==='data'"><legend>{{campo.titulo}}</legend><app-filtro-coluna [titulo]="campo.titulo" [tipo]="tipo(campo)" [opcoes]="campo.opcoes || []" [rotulos]="campo.rotulos || {}" [filtro]="rascunho[campo.campo] || {}" (filtroChange)="alterar(campo.campo,$event)" /></fieldset>
        }</div>
        @if (intervaloInvalido) { <p class="erro" role="alert">A data final deve ser igual ou posterior à data inicial.</p> }
        <footer><button type="button" class="limpar-todos" (click)="rascunho={}">Limpar seleção</button><div><button type="button" class="cancelar" (click)="modal.close()">Cancelar</button><button type="submit" class="aplicar" [disabled]="intervaloInvalido">Aplicar filtros</button></div></footer>
      </form>
    </dialog>`, styleUrl:'./filtros-tabela.scss',
})
export class FiltrosTabela {
  @Input() titulo='tabela'; @Input() campos:CampoFiltro[]=[]; @Input() filtros:Filtros={};
  @Output() aplicados=new EventEmitter<Filtros>();
  rascunho:Filtros={};
  get visiveis(){return this.campos.filter(c=>c.visivel!==false);}
  get ativos(){return this.visiveis.filter(c=>this.preenchido(this.filtros[c.campo]));}
  get intervaloInvalido(){return Object.values(this.rascunho).some(f=>f.inicio&&f.fim&&f.inicio>f.fim);}
  tipo(c:CampoFiltro):'texto'|'data'|'selecao'{return c.tipo==='data'?'data':c.tipo==='selecao'?'selecao':'texto';}
  preenchido(f?:FiltroColuna){return !!(f?.valor?.trim()||f?.inicio||f?.fim);}
  abrir(modal:HTMLDialogElement){this.rascunho=structuredClone(this.filtros);modal.showModal();}
  alterar(campo:string,filtro:FiltroColuna){this.rascunho={...this.rascunho,[campo]:filtro};}
  aplicar(event:Event,modal:HTMLDialogElement){event.preventDefault();if(this.intervaloInvalido)return;const filtros:Filtros={};for(const campo of this.visiveis){const f=this.rascunho[campo.campo];if(this.preenchido(f))filtros[campo.campo]={...f,...(f.valor!==undefined?{valor:f.valor.trim()}:{})};}this.aplicados.emit(filtros);modal.close();}
  remover(campo:string){const filtros={...this.filtros};delete filtros[campo];this.aplicados.emit(filtros);}
  descricao(c:CampoFiltro){const f=this.filtros[c.campo];if(!f)return '';if(c.tipo==='data'){const data=(s:string)=>s.split('-').reverse().join('/');return f.inicio&&f.fim?data(f.inicio)+' a '+data(f.fim):f.inicio?'A partir de '+data(f.inicio):f.fim?'Até '+data(f.fim):'';}return c.rotulos?.[f.valor??'']??f.valor??'';}
  fecharFora(event:MouseEvent,modal:HTMLDialogElement){if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}
}
