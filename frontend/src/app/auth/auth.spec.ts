import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, authInterceptor } from './auth.service';
import { Login } from './login';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('Autenticação', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Login], providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('verifica sessão e remove o usuário se expirar', () => {
    const auth = TestBed.inject(AuthService); const http = TestBed.inject(HttpTestingController);
    auth.verificar().subscribe();
    http.expectOne('/api/auth/me').flush({ usuario: { id: '1', nome: 'Teste', email: 't@example.com' } });
    expect(auth.usuario()?.id).toBe('1');
    auth.verificar().subscribe();
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.usuario()).toBeNull();
  });

  it('cria conta com nome e confirmação de senha e entra no dashboard', async () => {
    const fixture = TestBed.createComponent(Login); const app = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges(); http.expectOne('/api/auth/config').flush({ googleClientId: null });
    app.cadastro.set(true); fixture.detectChanges(); await fixture.whenStable();
    app.dados = { nome: 'Teste', email: 't@example.com', senha: 'senha longa de teste' };
    app.confirmarSenha = app.dados.senha;
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    app.enviar(form);
    const req = http.expectOne('/api/auth/register');
    expect(req.request.headers.get('X-Power-Beef')).toBe('1');
    expect(req.request.body.nome).toBe('Teste');
    req.flush({ usuario: { id: '1', nome: 'Teste', email: 't@example.com' } });
    expect(TestBed.inject(AuthService).usuario()?.nome).toBe('Teste');
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('mostra erro de credenciais e não cria sessão', () => {
    const auth = TestBed.inject(AuthService); const http = TestBed.inject(HttpTestingController);
    let status = 0;
    auth.entrar({ email: 't@example.com', senha: 'errada' }).subscribe({ error: e => status = e.status });
    http.expectOne('/api/auth/login').flush({ message: 'E-mail ou senha incorretos.' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401); expect(auth.usuario()).toBeNull();
  });

  it('envia logout e limpa a sessão local', () => {
    const auth = TestBed.inject(AuthService); const http = TestBed.inject(HttpTestingController);
    auth.usuario.set({ id: '1', nome: 'Teste', email: 't@example.com' });
    auth.sair().subscribe();
    const req = http.expectOne('/api/auth/logout'); expect(req.request.method).toBe('POST');
    req.flush({}); expect(auth.usuario()).toBeNull();
  });

  it('redireciona acesso sem sessão para a tela de login', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const navegar = harness.navigateByUrl('/pacotes');
    await vi.waitFor(() => {
      http.expectOne('/api/auth/me').flush({ usuario: null }, { status: 401, statusText: 'Unauthorized' });
    });
    await navegar;
    http.expectOne('/api/auth/config').flush({ googleClientId: null });
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Acesse sua conta');
  });
});
