import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdicionarPacotes } from './adicionar-pacotes';

describe('Cadastro por quantidade', () => {
  it('envia a quantidade e soma as unidades retornadas no estoque', async () => {
    TestBed.configureTestingModule({ imports: [AdicionarPacotes], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AdicionarPacotes);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/pacotes').flush([]);
    fixture.detectChanges(); await fixture.whenStable();
    const app = fixture.componentInstance;
    app.dados = { tipo: 'original', lote: 'LOTE-2', dataFabricacao: '2026-11-01', validade: '2027-05-01', status: 'em_estoque', observacoes: '' };
    app.quantidade = 2;
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    app.salvar(form);
    const req = http.expectOne('/api/pacotes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.quantidade).toBe(2);
    req.flush({ quantidade: 2, pacotes: [{ ...app.dados, _id: '1' }, { ...app.dados, _id: '2' }] });
    expect(app.estoque()).toBe(2);
    expect(app.quantidade).toBe(1);
    expect(app.aviso()).toContain('2 pacote(s)');
    http.verify();
  });
});
