import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';

/** Onde o voltar do sistema fecha o app: a tela inicial de quem está logado e a de quem não está. */
const SAIDAS = ['/hoje', '/entrar'];
/** As outras abas da barra de baixo: o voltar leva à tela Hoje, como nos apps Android. */
const ABAS = ['/planos', '/historico', '/perfil'];

/** Integração com o Android que não é de uma tela só. Liga apenas no app (Capacitor). */
@Injectable({ providedIn: 'root' })
export class IntegracaoAndroid {
  private readonly router = inject(Router);
  private readonly dialogo = inject(MatDialog);

  iniciar(): void {
    void App.addListener('backButton', ({ canGoBack }) => this.voltar(canGoBack));
  }

  /** Fecha o diálogo aberto; senão volta uma tela; só nas telas iniciais fecha o app. */
  voltar(podeVoltar: boolean): void {
    const aberto = this.dialogo.openDialogs.at(-1);
    if (aberto) {
      aberto.close();
      return;
    }
    const url = this.router.url.split(/[?#]/)[0];
    if (SAIDAS.includes(url)) {
      void App.exitApp();
    } else if (ABAS.includes(url) || !podeVoltar) {
      void this.router.navigateByUrl('/hoje');
    } else {
      history.back();
    }
  }
}
