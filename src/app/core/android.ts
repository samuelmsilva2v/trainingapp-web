import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NO_APP } from './cofre';
import { CANAL_LEMBRETE, reagendarLembretes } from './lembrete';

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
    // Canal com prioridade alta: som, vibração e o aviso aparece por cima de outro app.
    void LocalNotifications.createChannel({ id: CANAL_DESCANSO, name: 'Fim do descanso', importance: 5, vibration: true, visibility: 1 })
      .catch(() => undefined);
    void LocalNotifications.createChannel({ id: CANAL_LEMBRETE, name: 'Lembrete de treino', importance: 4, visibility: 1 })
      .catch(() => undefined);
    // Os avisos são de 14 dias: abrir o app renova a janela.
    void reagendarLembretes();
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

/**
 * Vibração: leve nos controles do treino (steppers, série feita), forte no fim do descanso. No navegador só o fim do
 * descanso vibra (navigator.vibrate, onde existe), como antes do app.
 */
export function vibrar(tipo: 'leve' | 'forte'): void {
  if (!NO_APP) {
    if (tipo === 'forte') navigator.vibrate?.(200);
    return;
  }
  void (tipo === 'leve' ? Haptics.impact({ style: ImpactStyle.Light }) : Haptics.vibrate({ duration: 400 }));
}

/** Tela ligada durante o treino (só no app): ninguém quer desbloquear o celular entre uma série e outra. */
export function manterTelaLigada(ligada: boolean): void {
  if (NO_APP) void (ligada ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
}

/** Uma notificação de descanso por vez: agendar outra substitui a anterior. */
const DESCANSO = 1;
const CANAL_DESCANSO = 'descanso';

/**
 * Avisa o fim do descanso por notificação local (só no app), para tocar com a tela bloqueada ou o app em segundo plano.
 * Sem alarme exato: o Android pode atrasar alguns segundos (a Play Store restringe a permissão de alarme exato).
 * A permissão de notificação é pedida no primeiro agendamento; recusada, o cronômetro na tela segue valendo.
 */
export async function agendarFimDoDescanso(fim: number, texto: string): Promise<void> {
  if (!NO_APP) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DESCANSO }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DESCANSO,
          channelId: CANAL_DESCANSO,
          title: 'Descanso acabou',
          body: texto,
          // Inexato de propósito: o padrão do plugin (exato) abre a tela de "Alarmes e lembretes" a cada descanso.
          isExactNotification: false,
          schedule: { at: new Date(fim), allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.warn('Não foi possível agendar o aviso do descanso', e);
  }
}

export function cancelarFimDoDescanso(): void {
  if (NO_APP) void LocalNotifications.cancel({ notifications: [{ id: DESCANSO }] }).catch(() => undefined);
}
