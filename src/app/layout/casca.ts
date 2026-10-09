import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-casca',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './casca.html',
  styleUrl: './casca.scss',
})
export class Casca {
  protected readonly abas = [
    { caminho: '/hoje', rotulo: 'Hoje', icone: 'fitness_center' },
    { caminho: '/planos', rotulo: 'Planos', icone: 'assignment' },
    { caminho: '/historico', rotulo: 'Histórico', icone: 'history' },
    { caminho: '/perfil', rotulo: 'Perfil', icone: 'person' },
  ];
}
