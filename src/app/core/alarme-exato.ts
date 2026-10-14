import { LocalNotifications } from '@capacitor/local-notifications';
import { NO_APP } from './cofre';

/**
 * Alarme exato (permissão "Alarmes e lembretes" do Android). Sem ele, o Android adia um aviso inexato em até 75% do
 * tempo que falta (medido: 15 s num descanso de 20 s). No Android 14+ vem negado até a pessoa permitir nas configurações;
 * o app pede uma vez só, explicando antes, e segue no inexato se ela recusar.
 */
const CHAVE_PEDIDO = 'trainingapp.alarmeExatoPedido';

let permitido = false;

/** O que vale agora para o `isExactNotification` dos avisos (sem a permissão, o plugin abriria a tela de configurações). */
export function alarmeExato(): boolean {
  return permitido;
}

/** Confere a permissão no aparelho (ao abrir o app e ao voltar para ele: a pessoa pode ter mudado nas configurações). */
export async function conferirAlarmeExato(): Promise<boolean> {
  if (!NO_APP) return false;
  try {
    permitido = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    permitido = false;
  }
  return permitido;
}

/** Ainda não tem a permissão e nunca foi perguntado: a tela explica antes de abrir as configurações do Android. */
export function devePedirAlarmeExato(): boolean {
  if (!NO_APP || permitido) return false;
  try {
    return !localStorage.getItem(CHAVE_PEDIDO);
  } catch {
    return false;
  }
}

/** Abre "Alarmes e lembretes" (se `abrir`) e marca que já perguntou, aceitando ou não. Devolve se ficou permitido. */
export async function pedirAlarmeExato(abrir: boolean): Promise<boolean> {
  try {
    localStorage.setItem(CHAVE_PEDIDO, new Date().toISOString());
  } catch {
    // sem armazenamento: pode perguntar de novo numa próxima abertura
  }
  if (!abrir || !NO_APP) return permitido;
  try {
    permitido = (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    await conferirAlarmeExato();
  }
  return permitido;
}
