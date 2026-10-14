import { LocalNotifications } from '@capacitor/local-notifications';
import { NO_APP } from './cofre';

/** Lembrete de dia de treino, guardado só no aparelho (é uma notificação local dele). */
export interface ConfigLembrete {
  ligado: boolean;
  /** "HH:MM" no fuso do aparelho. */
  hora: string;
  /** Dias da semana como no Date.getDay(): 0 = domingo ... 6 = sábado. */
  dias: number[];
}

/** O que o app sabe do treino na última vez que falou com a API: o texto do aviso e se hoje já foi. */
interface ContextoLembrete {
  proximoDia: string | null;
  /** Data local (AAAA-MM-DD) do último dia em que a pessoa treinou. */
  treinouEm: string | null;
}

export const LEMBRETE_PADRAO: ConfigLembrete = { ligado: false, hora: '18:00', dias: [1, 2, 3, 4, 5] };
export const CANAL_LEMBRETE = 'lembrete';

const CHAVE_CONFIG = 'trainingapp.lembrete';
const CHAVE_CONTEXTO = 'trainingapp.lembrete.contexto';
/** Avisos agendados um a um para os próximos dias (e não um repetido toda semana): assim dá para pular o dia em que já
 * houve treino e trocar o texto pelo próximo dia da rotação a cada vez que o app abre. Sem abrir o app por mais que
 * isso, os avisos acabam. */
const DIAS_AGENDADOS = 14;
const PRIMEIRO_ID = 200;

function ler<T>(chave: string): T | null {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: o lembrete vale só até fechar o app
  }
}

export function lerLembrete(): ConfigLembrete {
  return { ...LEMBRETE_PADRAO, ...ler<ConfigLembrete>(CHAVE_CONFIG) };
}

export function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Os avisos dos próximos dias: nos dias marcados, no horário escolhido, ainda no futuro e sem o de hoje se já treinou. */
export function avisosDoLembrete(config: ConfigLembrete, contexto: ContextoLembrete, agora: Date): { id: number; quando: Date }[] {
  if (!config.ligado || config.dias.length === 0) return [];
  const [hora, minuto] = config.hora.split(':').map(Number);
  const avisos: { id: number; quando: Date }[] = [];
  for (let d = 0; d < DIAS_AGENDADOS; d++) {
    const quando = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + d, hora, minuto);
    if (quando <= agora || !config.dias.includes(quando.getDay())) continue;
    if (d === 0 && contexto.treinouEm === dataLocal(agora)) continue;
    avisos.push({ id: PRIMEIRO_ID + d, quando });
  }
  return avisos;
}

/** Refaz os avisos (só no app). Chamado ao abrir o app, ao mudar o lembrete e quando a tela Hoje fala com a API. */
export async function reagendarLembretes(): Promise<void> {
  if (!NO_APP) return;
  const config = lerLembrete();
  const contexto = ler<ContextoLembrete>(CHAVE_CONTEXTO) ?? { proximoDia: null, treinouEm: null };
  try {
    await LocalNotifications.cancel({
      notifications: Array.from({ length: DIAS_AGENDADOS }, (_, d) => ({ id: PRIMEIRO_ID + d })),
    });
    const avisos = avisosDoLembrete(config, contexto, new Date());
    if (avisos.length === 0) return;
    await LocalNotifications.schedule({
      notifications: avisos.map(({ id, quando }) => ({
        id,
        channelId: CANAL_LEMBRETE,
        title: 'Dia de treino',
        body: contexto.proximoDia ? `Hoje é dia de ${contexto.proximoDia}.` : 'Hora de treinar.',
        // Inexato como o do descanso (ver web#35): o Android pode atrasar o aviso.
        isExactNotification: false,
        schedule: { at: quando, allowWhileIdle: true },
      })),
    });
  } catch (e) {
    console.warn('Não foi possível agendar o lembrete de treino', e);
  }
}

export async function salvarLembrete(config: ConfigLembrete): Promise<void> {
  gravar(CHAVE_CONFIG, config);
  await reagendarLembretes();
}

/** A tela Hoje conta o que sabe do treino (próximo dia da rotação e se já treinou hoje) e os avisos são refeitos. */
export function atualizarContextoDoLembrete(proximoDia: string | null, treinouHoje: boolean): void {
  if (!NO_APP) return;
  const anterior = ler<ContextoLembrete>(CHAVE_CONTEXTO);
  gravar(CHAVE_CONTEXTO, {
    proximoDia,
    treinouEm: treinouHoje ? dataLocal(new Date()) : (anterior?.treinouEm ?? null),
  } satisfies ContextoLembrete);
  void reagendarLembretes();
}
