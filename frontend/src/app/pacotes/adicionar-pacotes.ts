import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pacotes } from './pacotes';

@Component({ selector: 'app-adicionar-pacotes', imports: [FormsModule], templateUrl: './adicionar-pacotes.html', styleUrl: '../app.scss' })
export class AdicionarPacotes extends Pacotes {}
