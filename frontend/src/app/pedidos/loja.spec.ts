import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authTeste } from '../auth/auth.testing';
import { AuthService } from '../auth/auth.service';
import { Catalogo } from './catalogo';
import { Carrinho } from './carrinho';
import { Pedidos } from './pedidos';
import { CarrinhoService } from './carrinho.service';

describe('Compra de pacotes e pedidos', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Catalogo, Carrinho, Pedidos], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), authTeste('cliente')] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('recalcula o preço com sabores misturados, mudança de quantidade e remoção', async () => {
    const fixture = TestBed.createComponent(Carrinho); fixture.detectChanges(); await fixture.whenStable();
    const carrinho = TestBed.inject(CarrinhoService);
    carrinho.adicionar('original', 2); carrinho.adicionar('picante', 2);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.total-compra dd').textContent).toContain('69,90');
    expect(carrinho.precos().descontoCentavos).toBe(570);
    carrinho.alterar('original', 8); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.total-compra dd').textContent).toContain('159,90');
    carrinho.alterar('original', 23); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.total-compra dd').textContent).toContain('372,50');
    expect(fixture.nativeElement.querySelector('.combos-aplicados').textContent).toContain('Preço de 25+ pacotes');
    carrinho.remover('original'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.total-compra dd').textContent).toContain('37,80');
    carrinho.remover('picante'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.resumo-compra')).toBeNull();
    expect(carrinho.precos().totalCentavos).toBe(0);
  });

  it('administrador confirma a recusa e o pedido recusado fica sem ações', async () => {
    TestBed.inject(AuthService).usuario.set({ id: 'admin', nome: 'Admin', email: 'admin@example.com', perfil: 'administrador' });
    const fixture = TestBed.createComponent(Pedidos); const http = TestBed.inject(HttpTestingController);
    const pedido = { _id: '000000000000000000000010', clienteNome: 'Teste', clienteEmail: 'teste@example.com', createdAt: '2026-11-13', status: 'aceito', itens: [{ tipo: 'original', quantidade: 2, reservada: 2 }], historico: [] };
    http.expectOne('/api/pedidos').flush([pedido]); fixture.detectChanges(); await fixture.whenStable();
    const confirmacao = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const recusar = () => [...fixture.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.includes('Recusar pedido')) as HTMLButtonElement;
    expect(recusar()).toBeTruthy(); recusar().click(); http.expectNone('/api/pedidos/' + pedido._id);
    confirmacao.mockReturnValue(true); recusar().click();
    const atualizar = http.expectOne('/api/pedidos/' + pedido._id); expect(atualizar.request.method).toBe('PUT'); expect(atualizar.request.body).toEqual({ status: 'recusado' });
    const recusado = { ...pedido, status: 'recusado', itens: [{ tipo: 'original', quantidade: 2, reservada: 0 }], historico: [{ status: 'recusado', data: '2026-11-16' }] };
    atualizar.flush(recusado); http.expectOne('/api/pedidos').flush([recusado]); fixture.detectChanges(); await fixture.whenStable();
    expect(recusar()).toBeUndefined(); expect(fixture.nativeElement.querySelector('.status').textContent).toContain('Recusado');
    expect(fixture.nativeElement.querySelector('tbody').textContent).not.toContain('pendentes'); confirmacao.mockRestore();
  });

  it('apresenta quatro produtos, soma quantidades e mantém carrinhos separados por conta', async () => {
    const fixture = TestBed.createComponent(Catalogo); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.produto').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('.oferta').length).toBe(4);
    expect(fixture.nativeElement.querySelector('.promocoes').textContent).toContain('7,5%');
    expect(fixture.nativeElement.querySelector('.promocoes').textContent).toContain('15,4%');
    expect(fixture.nativeElement.querySelector('.promocoes').textContent).toContain('21,2%');
    expect(fixture.nativeElement.querySelector('[data-sabor="original"]').textContent).toContain('Sal e vinagre');
    expect(fixture.nativeElement.querySelector('[data-sabor="picante"]').textContent).toContain('Picância suave');
    const app = fixture.componentInstance; app.quantidades['original'] = 10; app.adicionar('original'); app.adicionar('original');
    expect(app.carrinho.total()).toBe(20);
    expect(app.carrinho.itens().length).toBe(1);
    expect(JSON.parse(localStorage.getItem('pb_carrinho_teste')!).itens[0].quantidade).toBe(20);
    app.quantidades['original'] = 1000; app.adicionar('original');
    expect(app.carrinho.total()).toBe(20); expect(app.erro()).toBeTruthy();
    TestBed.inject(AuthService).usuario.set({ id: 'outro', nome: 'Outro', email: 'o@example.com', perfil: 'cliente' });
    fixture.detectChanges(); await fixture.whenStable();
    expect(app.carrinho.total()).toBe(0);
  });

  it('envia um pedido, mantém o carrinho na falha e reutiliza a chave no reenvio', async () => {
    const fixture = TestBed.createComponent(Carrinho); fixture.detectChanges(); await fixture.whenStable();
    const carrinho = TestBed.inject(CarrinhoService); carrinho.adicionar('brasileirinho', 10);
    fixture.componentInstance.entrega = { nome: 'Cliente Teste', whatsapp: '(41) 99906-8051', endereco: 'Rua Teste, 123, Curitiba/PR', referencia: '' };
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const http = TestBed.inject(HttpTestingController);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.finalizar(form);
    const primeira = http.expectOne('/api/pedidos');
    expect(primeira.request.body.itens).toEqual([{ tipo: 'brasileirinho', quantidade: 10 }]);
    expect(primeira.request.body.entrega.nome).toBe('Cliente Teste');
    const chave = primeira.request.body.chaveEnvio;
    primeira.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(carrinho.total()).toBe(10);
    fixture.componentInstance.finalizar(form);
    const segunda = http.expectOne('/api/pedidos'); expect(segunda.request.body.chaveEnvio).toBe(chave);
    segunda.flush({ _id: '000000000000000000000010' });
    expect(carrinho.total()).toBe(0); expect(navegar).toHaveBeenCalled();
  });

  it('cliente acompanha status e não recebe botões de alteração', () => {
    const fixture = TestBed.createComponent(Pedidos);
    TestBed.inject(HttpTestingController).expectOne('/api/pedidos').flush([{
      _id: '000000000000000000000010', clienteNome: 'Teste', clienteEmail: 'teste@example.com', createdAt: '2026-11-13', status: 'em_producao',
      itens: [{ tipo: 'original', quantidade: 10, reservada: 4 }], historico: [],
    }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Meus pedidos');
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('6 pendentes');
    expect(fixture.nativeElement.querySelector('.acoes-pedido')).toBeNull();
    fixture.componentInstance.alterar(fixture.componentInstance.enviados()[0], 'aceito');
    TestBed.inject(HttpTestingController).expectNone('/api/pedidos/000000000000000000000010');
  });

  it('bloqueia o pedido sem entrega e renova a chave quando o endereço muda', async () => {
    const fixture = TestBed.createComponent(Carrinho); fixture.detectChanges(); await fixture.whenStable();
    const carrinho = TestBed.inject(CarrinhoService); carrinho.adicionar('original', 1);
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    fixture.componentInstance.finalizar(form); TestBed.inject(HttpTestingController).expectNone('/api/pedidos');
    fixture.componentInstance.entrega = { nome: 'Cliente Teste', whatsapp: '123', endereco: 'Rua Teste, 123', referencia: '' };
    fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.finalizar(form); TestBed.inject(HttpTestingController).expectNone('/api/pedidos');
    const entrega = { nome: 'Cliente Teste', whatsapp: '41999068051', endereco: 'Rua Teste, 123', referencia: '' };
    const a = carrinho.prepararPedido(entrega), b = carrinho.prepararPedido(entrega);
    expect(a.chaveEnvio).toBe(b.chaveEnvio);
    const c = carrinho.prepararPedido({...entrega,endereco:'Rua Nova, 456'});
    expect(c.chaveEnvio).not.toBe(a.chaveEnvio);expect(carrinho.total()).toBe(1);
  });
});
