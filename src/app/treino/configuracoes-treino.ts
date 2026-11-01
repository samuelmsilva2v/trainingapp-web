import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { OpcoesTreino } from '../configuracoes/opcoes-treino';

/** Folha de configurações aberta no treino em andamento: por cima da tela, para não encerrar o descanso. */
@Component({
  selector: 'app-configuracoes-treino',
  imports: [OpcoesTreino],
  template: `
    <section class="folha" role="dialog" aria-label="Configurações de treino">
      <header class="cabecalho">
        <h2 class="titulo-sm">Configurações</h2>
        <button type="button" class="btn-icone" aria-label="Fechar" (click)="ref.close()">
          <span class="icone" aria-hidden="true">close</span>
        </button>
      </header>
      <app-opcoes-treino />
    </section>
  `,
  styles: `
    .folha {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 85dvh;
      overflow-y: auto;
      padding: 24px 16px calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    }
    .cabecalho { display: flex; align-items: center; justify-content: space-between; gap: 8px; h2 { margin: 0; } }
  `,
})
export class ConfiguracoesTreino {
  protected readonly ref = inject(MatDialogRef<ConfiguracoesTreino>);
}
