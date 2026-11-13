import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Dashboard } from './dashboard';

describe('Vendas no dashboard', () => {
  it('agrupa vendas, preserva vendas sem data e filtra sem afetar estoque', () => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(Dashboard);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/pacotes').flush([
      { tipo: 'original', lote: 'A', status: 'vendido', dataVenda: '2026-11-13T00:00:00Z' },
      { tipo: 'original', lote: 'A', status: 'vendido', dataVenda: '2026-11-13T00:00:00Z' },
      { tipo: 'original', lote: 'B', status: 'vendido', dataVenda: '2026-11-13T00:00:00Z' },
      { tipo: 'picante', lote: 'C', status: 'vendido' },
      { tipo: 'original', lote: 'A', status: 'em_estoque' },
    ]);
    const app = fixture.componentInstance;
    expect(app.vendas().length).toBe(3);
    expect(app.totalVendido()).toBe(4);
    app.filtrarVenda('lote', { valor: 'A' });
    app.filtrarVenda('dataVenda', { inicio: '2026-11-13', fim: '2026-11-13' });
    fixture.detectChanges();
    expect(app.vendasFiltradas().length).toBe(1);
    expect(app.totalVendido()).toBe(2);
    expect(app.total()).toBe(1);
    expect(fixture.nativeElement.querySelector('.vendas').textContent).toContain('1 encontrados de 3 registros');
    app.filtrosVendas.set({});
    expect(app.vendasFiltradas().length).toBe(3);
    http.verify();
  });
});
