import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pacotes } from './pacotes';

@Component({ selector: 'app-adicionar-venda', imports: [FormsModule], templateUrl: './adicionar-venda.html', styleUrl: '../app.scss' })
export class AdicionarVenda extends Pacotes {}
