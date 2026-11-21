import { TestBed } from '@angular/core/testing';
import { NotificacoesService } from './notificacoes.service';

describe('Notificações da aplicação',()=>{
  afterEach(()=>{vi.useRealTimers();});
  it('mantém sucessos repetidos e distingue os três tipos de alerta',()=>{
    const service=TestBed.inject(NotificacoesService);
    service.sucesso('2 pacotes de Original adicionados ao carrinho.');service.sucesso('2 pacotes de Original adicionados ao carrinho.');service.erro('Falha no pedido.');service.informacao('Item removido.');
    expect(service.mensagens().map(m=>m.tipo)).toEqual(['sucesso','sucesso','erro','informacao']);
    expect(new Set(service.mensagens().map(m=>m.id)).size).toBe(4);
    service.fechar(service.mensagens()[1].id);expect(service.mensagens().length).toBe(3);
  });
  it('pausa o fechamento durante a interação e retoma depois',()=>{
    vi.useFakeTimers();const service=TestBed.inject(NotificacoesService);const id=service.sucesso('Pacote adicionado.')!;
    vi.advanceTimersByTime(3000);service.pausar(id);vi.advanceTimersByTime(15000);expect(service.mensagens().length).toBe(1);
    service.retomar(id);vi.advanceTimersByTime(5500);expect(service.mensagens().length).toBe(0);
  });
  it('limita a pilha para não ocupar toda a tela e dá mais tempo ao erro',()=>{
    vi.useFakeTimers();const service=TestBed.inject(NotificacoesService);for(let i=0;i<8;i++)service.sucesso('Mensagem '+i);
    expect(service.mensagens().length).toBe(4);service.erro('Erro');vi.advanceTimersByTime(5500);expect(service.mensagens().map(m=>m.tipo)).toEqual(['erro']);vi.advanceTimersByTime(3500);expect(service.mensagens().length).toBe(0);
  });
});
