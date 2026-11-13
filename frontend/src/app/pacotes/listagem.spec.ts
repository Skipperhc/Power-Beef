import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Pacotes } from './pacotes';

describe('Paginação integrada aos filtros de pacotes', () => {
  it('mostra só a página atual e reinicia ao aplicar filtro', () => {
    TestBed.configureTestingModule({ imports: [Pacotes], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(Pacotes);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/pacotes').flush(Array.from({ length: 26 }, (_, i) => ({
      _id: String(i), tipo: i < 5 ? 'picante' : 'original', lote: 'A', status: 'em_estoque', dataFabricacao: '2026-11-01', validade: '2027-05-01',
    })));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(10);
    const botoes: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('app-paginador button'));
    botoes.find(b => b.textContent?.trim() === 'Próxima')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.paginacao.pagina()).toBe(2);
    fixture.componentInstance.filtrarColuna('tipo', { valor: 'picante' });
    fixture.detectChanges();
    expect(fixture.componentInstance.paginacao.pagina()).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    expect(fixture.componentInstance.estoque()).toBe(26);
    http.verify();
  });
});
