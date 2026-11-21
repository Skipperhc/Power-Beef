import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { MenuIcon } from './menu-icon';
import { Notificacoes } from './shared/notificacoes';
import { acompanharNotificacoes } from './shared/notificacoes.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MenuIcon, Notificacoes],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './shell.scss'],
})
export class App {
  readonly menuAberto = signal(false);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly erroSaida = signal('');
  private readonly alertas = acompanharNotificacoes(this.erroSaida);
  get telasMenu() {
    const admin = this.auth.usuario()?.perfil === 'administrador';
    return [
      ...(admin ? [
        {url:'/', nome:'Dashboard', icone:'dashboard', exato:true},
        {url:'/pedidos', nome:'Gerenciar pedidos', icone:'orders', exato:false},
        {url:'/pacotes/adicionar', nome:'Adicionar pacotes', icone:'add', exato:false},
        {url:'/vendas/adicionar', nome:'Adicionar vendas', icone:'sale', exato:false},
        {url:'/pacotes', nome:'Listar pacotes', icone:'package', exato:true},
      ] : []),
      {url:'/cliente', nome:'Produtos', icone:'products', exato:false},
      {url:'/carrinho', nome:'Carrinho', icone:'cart', exato:false},
      admin ? {url:'/usuarios', nome:'Usuários', icone:'users', exato:false} : {url:'/pedidos', nome:'Meus pedidos', icone:'orders', exato:false},
    ];
  }
  clicarBarra(event: MouseEvent) {
    if (!(event.target as Element).closest('a, button, input, select, textarea')) this.menuAberto.set(!this.menuAberto());
  }
  navegarMenu(event: MouseEvent) {
    if ((event.target as Element).closest('a') && window.matchMedia('(max-width: 760px)').matches) this.menuAberto.set(false);
  }
  sair() {
    this.auth.sair().subscribe({ next: () => { this.menuAberto.set(false); void this.router.navigateByUrl('/login'); }, error: () => this.erroSaida.set('Não foi possível sair. Tente novamente.') });
  }
}
