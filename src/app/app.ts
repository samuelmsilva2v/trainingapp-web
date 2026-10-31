import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TelaErro } from './compartilhado/tela-erro';
import { AuthStore } from './core/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TelaErro],
  // A abertura não falou com a API (web): a tela de erro fica no lugar das rotas até uma nova tentativa dar certo.
  template: `
    @if (auth.falhaAbertura(); as falha) {
      <app-tela-erro [falha]="falha" [cheia]="true" (tentar)="auth.tentarAbrirDeNovo()" />
    } @else {
      <router-outlet />
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthStore);
}
