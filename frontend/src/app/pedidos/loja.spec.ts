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

  it('apresenta quatro produtos, soma quantidades e mantém carrinhos separados por conta', async () => {
    const fixture = TestBed.createComponent(Catalogo); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.produto').length).toBe(4);
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
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const http = TestBed.inject(HttpTestingController);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.finalizar(form);
    const primeira = http.expectOne('/api/pedidos');
    expect(primeira.request.body.itens).toEqual([{ tipo: 'brasileirinho', quantidade: 10 }]);
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
});
