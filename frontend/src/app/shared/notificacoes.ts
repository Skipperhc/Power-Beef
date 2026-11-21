import { Component, inject } from '@angular/core';
import { NotificacoesService } from './notificacoes.service';
@Component({selector:'app-notificacoes',template:`
  <section class="notificacoes" aria-label="Notificações">
    @for (item of notificacoes.mensagens(); track item.id) {
      <article class="notificacao" [class]="'notificacao '+item.tipo" [attr.role]="item.tipo==='erro'?'alert':'status'" aria-atomic="true" (mouseenter)="notificacoes.pausar(item.id)" (mouseleave)="notificacoes.retomar(item.id)" (focusin)="notificacoes.pausar(item.id)" (focusout)="notificacoes.retomar(item.id)">
        <span class="notificacao-icone" aria-hidden="true">{{item.tipo==='sucesso'?'✓':item.tipo==='erro'?'!':'i'}}</span>
        <div><strong>{{item.tipo==='sucesso'?'Sucesso':item.tipo==='erro'?'Ocorreu um erro':'Informação'}}</strong><p>{{item.mensagem}}</p></div>
        <button type="button" (click)="notificacoes.fechar(item.id)" [attr.aria-label]="'Fechar notificação: '+item.mensagem">×</button>
      </article>
    }
  </section>`,styleUrl:'./notificacoes.scss'})
export class Notificacoes { readonly notificacoes=inject(NotificacoesService); }
