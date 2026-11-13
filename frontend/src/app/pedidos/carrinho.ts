import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CarrinhoService } from './carrinho.service';

@Component({ selector: 'app-carrinho', imports: [FormsModule, RouterLink], templateUrl: './carrinho.html', styleUrls: ['../app.scss', './loja.scss'] })
export class Carrinho {
  readonly carrinho = inject(CarrinhoService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly enviando = signal(false);
  readonly erro = signal('');
  finalizar(form: NgForm) {
    const dados = this.carrinho.atual();
    if (form.invalid || this.enviando() || !dados?.itens.length) return;
    this.enviando.set(true); this.erro.set('');
    this.http.post<{ _id: string }>('/api/pedidos', dados).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: pedido => { this.carrinho.limpar(dados.chaveEnvio); void this.router.navigate(['/pedidos'], { queryParams: { enviado: pedido._id } }); },
      error: e => this.erro.set(e.error?.message || 'Não foi possível enviar. Seu carrinho foi mantido; tente novamente.'),
    });
  }
}
