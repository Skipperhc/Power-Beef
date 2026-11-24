import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';

export interface Usuario { id: string; nome: string; email: string; perfil?: 'administrador' | 'cliente'; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly usuario = signal<Usuario | null>(null);
  verificar() {
    return this.http.get<{ usuario: Usuario }>('/api/auth/me').pipe(map(res => res.usuario), tap(u => this.usuario.set(u)),
      catchError(() => { this.usuario.set(null); return of(null); }));
  }
  entrar(dados: { email: string; senha: string }) { return this.autenticar('/api/auth/login', dados); }
  cadastrar(dados: { nome: string; email: string; senha: string }) { return this.autenticar('/api/auth/register', dados); }
  google(credential: string) { return this.autenticar('/api/auth/google', { credential }); }
  sair() { return this.http.post('/api/auth/logout', {}).pipe(tap(() => this.usuario.set(null))); }
  private autenticar(url: string, dados: object) {
    return this.http.post<{ usuario: Usuario }>(url, dados).pipe(tap(res => this.usuario.set(res.usuario)));
  }
}
export const sessaoOpcional: CanActivateFn = () => inject(AuthService).verificar().pipe(map(() => true));
export const inicio: CanActivateFn = () => {
  const auth = inject(AuthService), router = inject(Router);
  return auth.verificar().pipe(map(u => u?.perfil === 'administrador' ? true : router.createUrlTree(['/cliente'])));
};
export const autenticado: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.verificar().pipe(map(u => u ? true : router.createUrlTree(['/login'], { queryParams: { retorno: state.url } })));
};
export const administrador: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.verificar().pipe(map(u => !u ? router.createUrlTree(['/login']) : u.perfil === 'administrador' ? true : router.createUrlTree(['/cliente'])));
};
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router); const auth = inject(AuthService);
  if (!req.url.startsWith('/api/')) return next(req);
  return next(req.clone({ setHeaders: { 'X-Power-Beef': '1' } })).pipe(catchError(error => {
    if (error.status === 401 && !req.url.startsWith('/api/auth/')) { auth.usuario.set(null); void router.navigate(['/login'], { queryParams: { retorno: router.url } }); }
    throw error;
  }));
};
