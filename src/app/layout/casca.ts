import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GamificacaoStore } from '../core/gamificacao-store';
import { formatarKg } from '../core/formatos';

@Component({
  selector: 'app-casca',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './casca.html',
  styleUrl: './casca.scss',
})
export class Casca implements OnInit {
  protected readonly gamificacao = inject(GamificacaoStore);
  protected readonly formatar = formatarKg;

  protected readonly abas = [
    { caminho: '/hoje', rotulo: 'Hoje', icone: 'fitness_center' },
    { caminho: '/planos', rotulo: 'Planos', icone: 'assignment' },
    { caminho: '/historico', rotulo: 'Histórico', icone: 'history' },
    { caminho: '/perfil', rotulo: 'Perfil', icone: 'person' },
  ];

  ngOnInit(): void {
    this.gamificacao.atualizar();
  }
}
