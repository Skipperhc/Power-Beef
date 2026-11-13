import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { authTeste } from './auth/auth.testing';

describe('Home e navegação', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), authTeste()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('abre o dashboard na home e conta apenas estoque de cada sabor', async () => {
    const harness = await RouterTestingHarness.create('/');
    TestBed.inject(HttpTestingController).expectOne('/api/pacotes').flush([
      { tipo: 'original', status: 'em_estoque' }, { tipo: 'original', status: 'vendido' },
      { tipo: 'picante', status: 'em_estoque' }, { tipo: 'picante', status: 'em_estoque' },
      { tipo: 'churrasco', status: 'descartado' },
    ]);
    harness.detectChanges();
    const el = harness.routeNativeElement!;
    expect(el.querySelector('h1')?.textContent).toBe('Dashboard');
    expect(el.querySelector('.resumo strong')?.textContent).toBe('3');
    for (const [sabor, quantidade] of [['original', '1'], ['picante', '2'], ['churrasco', '0'], ['brasileirinho', '0']]) {
      expect(el.querySelector(`[data-sabor="${sabor}"] .quantidade`)?.textContent).toBe(quantidade);
    }
  });

  it('mostra erro sem apresentar zeros falsos quando a API falha', async () => {
    const harness = await RouterTestingHarness.create('/');
    TestBed.inject(HttpTestingController).expectOne('/api/pacotes').flush({}, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.quantidade')).toBeNull();
  });

  it('mantém o cadastro acessível e recarrega o resumo ao voltar à home', async () => {
    const harness = await RouterTestingHarness.create('/pacotes');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/pacotes').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Listar pacotes');
    expect(harness.routeNativeElement!.querySelector('form')).toBeNull();
    await harness.navigateByUrl('/');
    http.expectOne('/api/pacotes').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelectorAll('.card').length).toBe(4);
    expect(harness.routeNativeElement!.querySelector('.resumo strong')?.textContent).toBe('0');
  });
});
