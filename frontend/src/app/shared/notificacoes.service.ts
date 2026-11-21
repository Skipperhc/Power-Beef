import { DestroyRef, Injectable, Signal, effect, inject, signal, untracked } from '@angular/core';

export type TipoNotificacao = 'sucesso' | 'erro' | 'informacao';
export interface Notificacao { id: number; tipo: TipoNotificacao; mensagem: string; }
@Injectable({providedIn:'root'})
export class NotificacoesService {
  private sequencia=0;
  private readonly lista=signal<Notificacao[]>([]);
  readonly mensagens=this.lista.asReadonly();
  private readonly timers=new Map<number,ReturnType<typeof setTimeout>>();
  constructor(){inject(DestroyRef).onDestroy(()=>{for(const timer of this.timers.values())clearTimeout(timer);});}
  sucesso(mensagem:string){return this.mostrar('sucesso',mensagem);}
  erro(mensagem:string){return this.mostrar('erro',mensagem);}
  informacao(mensagem:string){return this.mostrar('informacao',mensagem);}
  mostrar(tipo:TipoNotificacao,mensagem:string){
    if(!mensagem.trim())return;
    const item={id:++this.sequencia,tipo,mensagem};
    if(this.lista().length>=4)this.fechar(this.lista()[0].id);
    this.lista.update(lista=>[...lista,item]);this.retomar(item.id);return item.id;
  }
  fechar(id:number){this.pausar(id);this.lista.update(lista=>lista.filter(item=>item.id!==id));}
  pausar(id:number){const timer=this.timers.get(id);if(timer)clearTimeout(timer);this.timers.delete(id);}
  retomar(id:number){this.pausar(id);const item=this.lista().find(m=>m.id===id);if(item)this.timers.set(id,setTimeout(()=>this.fechar(id),item.tipo==='erro'?9000:5500));}
}

/** Mantém as mensagens das telas existentes, apresentadas pelo host global. */
export function acompanharNotificacoes(erro:Signal<string>,sucesso?:Signal<string>){
  const notificacoes=inject(NotificacoesService);let ultimoErro='',ultimoSucesso='';
  return effect(()=>{const e=erro(),s=sucesso?.()??'';untracked(()=>{if(e&&e!==ultimoErro)notificacoes.erro(e);if(s&&s!==ultimoSucesso)notificacoes.sucesso(s);});ultimoErro=e;ultimoSucesso=s;});
}
