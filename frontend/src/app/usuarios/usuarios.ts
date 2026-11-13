import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Paginacao } from '../shared/paginacao';
import { Paginador } from '../shared/paginador';
import { FiltroColunaComponent } from '../shared/filtro-coluna';
import { Filtros, FiltroColuna, filtrar } from '../shared/filtros';

interface UsuarioGestao {
  id: string; nome: string; email: string; perfil: 'cliente' | 'administrador'; ativo: boolean;
  provedor: 'email' | 'google'; createdAt: string; ultimoLogin?: string;
}
interface EmailAdmin { _id: string; email: string; }

@Component({ selector: 'app-usuarios', imports: [FormsModule, DatePipe, Paginador, FiltroColunaComponent], templateUrl: './usuarios.html', styleUrls: ['../app.scss', './usuarios.scss'] })
export class Usuarios {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly usuarios = signal<UsuarioGestao[]>([]);
  readonly emails = signal<EmailAdmin[]>([]);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly editando = signal<UsuarioGestao | null>(null);
  readonly filtros = signal<Filtros>({});
  readonly filtrados = computed(() => filtrar(this.usuarios(), this.filtros(), ['perfil', 'provedor', 'ativo']));
  readonly paginacao = new Paginacao(() => this.filtrados());
  dados = this.vazio();
  emailAdmin = '';
  constructor() { this.carregar(); }
  private vazio() { return { nome: '', email: '', senha: '', perfil: 'cliente' as 'cliente' | 'administrador', ativo: true }; }
  carregar() {
    this.ocupado.set(true); this.erro.set('');
    forkJoin({ usuarios: this.http.get<UsuarioGestao[]>('/api/usuarios'), emails: this.http.get<EmailAdmin[]>('/api/emails-administradores') })
      .pipe(finalize(() => this.ocupado.set(false))).subscribe({ next: r => { this.usuarios.set(r.usuarios); this.emails.set(r.emails); }, error: e => this.falha(e) });
  }
  filtrar(campo: string, filtro: FiltroColuna) { this.filtros.update(f => ({ ...f, [campo]: filtro })); this.paginacao.primeira(); }
  limpar() { this.filtros.set({}); this.paginacao.primeira(); }
  editar(u: UsuarioGestao, form: NgForm) {
    this.editando.set(u); this.dados = { nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo };
    form.resetForm(this.dados); this.erro.set(''); this.aviso.set(''); document.getElementById('usuario-nome')?.focus();
  }
  cancelar(form: NgForm) { this.editando.set(null); this.dados = this.vazio(); form.resetForm(this.dados); }
  salvar(form: NgForm) {
    if (form.invalid || this.ocupado()) return;
    const { senha, ...dados } = this.dados;
    const id = this.editando()?.id;
    const req = id ? this.http.put(`/api/usuarios/${id}`, dados) : this.http.post('/api/usuarios', { ...dados, senha });
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    req.subscribe({ next: () => { this.cancelar(form); this.aviso.set(id ? 'Usuário atualizado. Ele precisará entrar novamente.' : 'Usuário criado.'); this.carregar(); }, error: e => { this.ocupado.set(false); this.falha(e); } });
  }
  excluir(u: UsuarioGestao, form: NgForm) {
    if (this.ocupado() || !window.confirm(`Excluir o usuário ${u.nome} (${u.email})? Ele poderá criar uma nova conta como cliente posteriormente.`)) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.http.delete(`/api/usuarios/${u.id}`).subscribe({ next: () => { if (this.editando()?.id === u.id) this.cancelar(form); this.aviso.set('Usuário excluído e sessões encerradas.'); this.carregar(); }, error: e => { this.ocupado.set(false); this.falha(e); } });
  }
  autorizar(form: NgForm) {
    if (form.invalid || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.http.post('/api/emails-administradores', { email: this.emailAdmin }).subscribe({ next: () => { this.emailAdmin = ''; form.resetForm(); this.aviso.set('E-mail autorizado como administrador.'); this.carregar(); }, error: e => { this.ocupado.set(false); this.falha(e); } });
  }
  revogar(email: EmailAdmin) {
    if (this.ocupado() || !window.confirm(`Remover o acesso de administrador de ${email.email}?`)) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.http.delete(`/api/emails-administradores/${email._id}`).subscribe({ next: () => { this.aviso.set('Autorização removida. A conta passa a cliente.'); this.carregar(); }, error: e => { this.ocupado.set(false); this.falha(e); } });
  }
  private falha(e: { error?: { message?: string } }) { this.erro.set(e.error?.message || 'Não foi possível concluir. Verifique a conexão.'); }
}
