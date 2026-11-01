import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OpcoesTreino } from './opcoes-treino';

/** Configurações de treino, aberta pelo Perfil; as opções ficam em OpcoesTreino (a folha do treino usa as mesmas). */
@Component({
  selector: 'app-configuracoes',
  imports: [OpcoesTreino],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.scss',
})
export class ConfiguracoesTela {
  private readonly roteador = inject(Router);

  protected voltar(): void {
    void this.roteador.navigate(['/perfil']);
  }
}
