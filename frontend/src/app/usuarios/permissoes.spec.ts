import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { routes } from '../app.routes';
import { App } from '../app';

describe('Permissões do cliente', () => {
  beforeEach(() => {
    const cliente = { id: '1', nome: 'Cliente', email: 'cliente@example.com', perfil: 'cliente' as const };
    TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient(), provideRouter(routes),
      { provide: AuthService, useValue: { usuario: signal(cliente), verificar: () => of(cliente) } },
    ] });
  });
  it('redireciona cliente que tenta abrir gestão de usuários ou estoque', async () => {
    const harness = await RouterTestingHarness.create();
    for (const rota of ['/usuarios', '/pacotes', '/pacotes/adicionar', '/vendas/adicionar', '/']) {
      await harness.navigateByUrl(rota);
      expect(TestBed.inject(Router).url).toBe('/cliente');
      expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toContain('Quatro sabores.');
    }
  });
  it('oculta funções administrativas no menu', () => {
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="/usuarios"]')).toBeNull();
    expect(el.querySelector('a[href="/pacotes"]')).toBeNull();
    expect(el.querySelector('a[href="/vendas/adicionar"]')).toBeNull();
  });
});
