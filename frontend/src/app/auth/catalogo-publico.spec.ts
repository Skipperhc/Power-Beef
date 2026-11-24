import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { routes } from '../app.routes';

describe('Catálogo público e páginas privadas',()=>{
  beforeEach(()=>{localStorage.clear();TestBed.configureTestingModule({providers:[provideRouter(routes),provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{usuario:signal(null),verificar:()=>of(null)}}]});});
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  it('abre o catálogo na home sem exigir login e permite consultar o carrinho',async()=>{
    const harness=await RouterTestingHarness.create('/');expect(TestBed.inject(Router).url).toBe('/cliente');expect(harness.routeNativeElement!.querySelectorAll('.produto').length).toBe(4);await harness.navigateByUrl('/carrinho');expect(TestBed.inject(Router).url).toBe('/carrinho');expect(harness.routeNativeElement!.textContent).toContain('Seu carrinho está vazio');
  });
  it('continua protegendo os pedidos e guarda o destino para depois do login',async()=>{
    const harness=await RouterTestingHarness.create('/pedidos');TestBed.inject(HttpTestingController).expectOne('/api/auth/config').flush({googleClientId:null});const router=TestBed.inject(Router);expect(router.parseUrl(router.url).queryParams['retorno']).toBe('/pedidos');expect(harness.routeNativeElement!.querySelector('input[type=password]')).toBeTruthy();TestBed.inject(HttpTestingController).expectNone('/api/pedidos');
  });
});
