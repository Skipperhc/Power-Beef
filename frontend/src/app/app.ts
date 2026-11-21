import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { Notificacoes } from './shared/notificacoes';
import { acompanharNotificacoes } from './shared/notificacoes.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Notificacoes],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './shell.scss'],
})
export class App {
  readonly menuAberto = signal(false);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly erroSaida = signal('');
  private readonly alertas = acompanharNotificacoes(this.erroSaida);
  sair() {
    this.auth.sair().subscribe({ next: () => { this.menuAberto.set(false); void this.router.navigateByUrl('/login'); }, error: () => this.erroSaida.set('Não foi possível sair. Tente novamente.') });
  }
}
