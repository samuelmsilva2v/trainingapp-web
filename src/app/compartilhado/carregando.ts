import { Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/** Indicador de carregamento das telas menores (editor, seletor, peso) e do que abre dentro de um cartão. */
@Component({
  selector: 'app-carregando',
  imports: [MatProgressSpinner],
  template: `
    <mat-progress-spinner mode="indeterminate" [diameter]="tamanho()" />
    <span class="so-leitor">Carregando</span>
  `,
  host: { role: 'status', 'aria-busy': 'true' },
  styles: `
    :host { display: flex; justify-content: center; padding: 24px 0; }
  `,
})
export class Carregando {
  readonly tamanho = input(32);
}
