import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Usuarios } from './usuarios';
import { authTeste } from '../auth/auth.testing';

describe('Gestão de usuários', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Usuarios], providers: [provideHttpClient(), provideHttpClientTesting(), authTeste()] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('lista usuários e autorização administrativa sem mostrar senha', () => {
    const fixture = TestBed.createComponent(Usuarios); const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/usuarios').flush([{ id: '2', nome: 'Cliente', email: 'c@example.com', perfil: 'cliente', ativo: true, provedor: 'google', createdAt: '2026-11-13' }]);
    http.expectOne('/api/emails-administradores').flush([{ _id: '3', email: 'futuro@example.com' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Cliente');
    expect(fixture.nativeElement.querySelector('.emails-admin').textContent).toContain('futuro@example.com');
    expect(fixture.nativeElement.querySelector('tbody').textContent).not.toContain('senha');
    fixture.componentInstance.filtrar('perfil', { valor: 'administrador' });
    expect(fixture.componentInstance.filtrados()).toEqual([]);
  });
  it('cria usuário com perfil explícito e recarrega listagens', async () => {
    const fixture = TestBed.createComponent(Usuarios); const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/usuarios').flush([]); http.expectOne('/api/emails-administradores').flush([]);
    fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.dados = { nome: 'Novo', email: 'novo@example.com', senha: 'senha longa de teste', perfil: 'administrador', ativo: true };
    fixture.detectChanges(); await fixture.whenStable();
    const form = fixture.debugElement.queryAll(By.directive(NgForm))[0].injector.get(NgForm);
    fixture.componentInstance.salvar(form);
    const req = http.expectOne('/api/usuarios');
    expect(req.request.method).toBe('POST'); expect(req.request.body.perfil).toBe('administrador');
    req.flush({});
    http.expectOne('/api/usuarios').flush([]); http.expectOne('/api/emails-administradores').flush([]);
    expect(fixture.componentInstance.aviso()).toBe('Usuário criado.');
  });
});
