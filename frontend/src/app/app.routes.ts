import { Routes } from '@angular/router';
import { autenticado, administrador } from './auth/auth.service';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login').then(m => m.Login) },
  { path: 'usuarios', canActivate: [administrador], loadComponent: () => import('./usuarios/usuarios').then(m => m.Usuarios) },
  { path: 'cliente', canActivate: [autenticado], loadComponent: () => import('./pedidos/catalogo').then(m => m.Catalogo) },
  { path: 'carrinho', canActivate: [autenticado], loadComponent: () => import('./pedidos/carrinho').then(m => m.Carrinho) },
  { path: 'pedidos', canActivate: [autenticado], loadComponent: () => import('./pedidos/pedidos').then(m => m.Pedidos) },
  { path: '', canActivate: [administrador], pathMatch: 'full', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'pacotes', canActivate: [administrador], loadComponent: () => import('./pacotes/pacotes').then(m => m.Pacotes) },
  { path: 'pacotes/adicionar', canActivate: [administrador], loadComponent: () => import('./pacotes/adicionar-pacotes').then(m => m.AdicionarPacotes) },
  { path: 'vendas/adicionar', canActivate: [administrador], loadComponent: () => import('./pacotes/adicionar-venda').then(m => m.AdicionarVenda) },
  { path: '**', redirectTo: '' },
];


