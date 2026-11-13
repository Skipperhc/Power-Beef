import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
import { routes } from './app.routes';
import { authTeste } from './auth/auth.testing';

describe('Menu lateral e funções dedicadas', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [App], providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), authTeste()],
  }));
  it('recolhe e expande o menu com links para todas as funções', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector<HTMLButtonElement>('.alternar-menu')!;
    expect(button.textContent?.trim()).toBe('←');
    expect(el.querySelector<HTMLElement>('#funcoes-menu')!.hidden).toBe(true);
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector<HTMLElement>('#funcoes-menu')!.hidden).toBe(false);
    expect(el.querySelectorAll('#funcoes-menu a').length).toBe(8);
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
  it('abre cada formulário em sua própria rota', async () => {
    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    for (const [url, titulo] of [['/pacotes/adicionar', 'Adicionar pacotes'], ['/vendas/adicionar', 'Adicionar venda']]) {
      await harness.navigateByUrl(url);
      http.expectOne('/api/pacotes').flush([]);
      harness.detectChanges();
      expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe(titulo);
      expect(harness.routeNativeElement!.querySelectorAll('form').length).toBe(1);
      expect(harness.routeNativeElement!.querySelector('table')).toBeNull();
    }
    http.verify();
  });
});
