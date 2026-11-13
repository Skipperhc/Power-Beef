import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

export function authTeste(perfil: 'administrador' | 'cliente' = 'administrador') {
  const usuario = { id: 'teste', nome: 'Teste', email: 'teste@example.com', perfil };
  return { provide: AuthService, useValue: { usuario: signal(usuario), verificar: () => of(usuario), sair: () => of({}) } };
}

