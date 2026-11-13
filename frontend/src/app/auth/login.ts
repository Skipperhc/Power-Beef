import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

interface GoogleIdentity { accounts: { id: {
  initialize(options: { client_id: string; callback: (res: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string }): void;
} }; }
declare global { interface Window { google?: GoogleIdentity; } }
let googleScript: Promise<void> | undefined;
function carregarGoogle() {
  return googleScript ??= new Promise<void>((resolve, reject) => {
    if (window.google) return resolve();
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { googleScript = undefined; script.remove(); reject(new Error('Google indisponível')); };
    document.head.appendChild(script);
  });
}
@Component({ selector: 'app-login', imports: [FormsModule], templateUrl: './login.html', styleUrls: ['../app.scss', './login.scss'] })
export class Login implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  @ViewChild('botaoGoogle') botaoGoogle!: ElementRef<HTMLElement>;
  readonly cadastro = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly googleAviso = signal('Carregando opção Google…');
  dados = { nome: '', email: '', senha: '' };
  confirmarSenha = '';
  private ativo = true;
  private config?: Subscription;
  ngAfterViewInit() {
    this.config = this.http.get<{ googleClientId: string | null }>('/api/auth/config').subscribe({
      next: async config => {
        if (!config.googleClientId) { this.googleAviso.set('Login Google disponível após configurar o Client ID.'); return; }
        try {
          await carregarGoogle(); if (!this.ativo) return;
          window.google!.accounts.id.initialize({ client_id: config.googleClientId, callback: res => this.zone.run(() => this.entrarGoogle(res.credential)) });
          window.google!.accounts.id.renderButton(this.botaoGoogle.nativeElement, { theme: 'outline', size: 'large', text: 'continue_with' });
          this.googleAviso.set('');
        } catch { this.googleAviso.set('Não foi possível carregar o Google. Recarregue a página.'); }
      }, error: () => this.googleAviso.set('Não foi possível consultar a configuração do Google.'),
    });
  }
  ngOnDestroy() { this.ativo = false; this.config?.unsubscribe(); }
  alternar(form: NgForm) {
    this.cadastro.set(!this.cadastro()); this.dados = { nome: '', email: '', senha: '' }; this.confirmarSenha = '';
    form.resetForm(); this.erro.set('');
  }
  enviar(form: NgForm) {
    if (form.invalid || this.ocupado()) return;
    if (this.cadastro() && this.dados.senha !== this.confirmarSenha) { this.erro.set('As senhas precisam ser iguais.'); return; }
    this.ocupado.set(true); this.erro.set('');
    const request = this.cadastro() ? this.auth.cadastrar(this.dados) : this.auth.entrar(this.dados);
    request.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: () => { void this.router.navigateByUrl('/'); }, error: e => this.erro.set(e.error?.message || 'Não foi possível entrar. Verifique a conexão.'),
    });
  }
  private entrarGoogle(credential: string) {
    if (!this.ativo || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set('');
    this.auth.google(credential).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: () => { void this.router.navigateByUrl('/'); }, error: e => this.erro.set(e.error?.message || 'Não foi possível entrar com Google.'),
    });
  }
}
