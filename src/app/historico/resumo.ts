import { duracaoMinutos } from '../core/formatos';
import { SessaoResumo } from '../core/modelos';

export type Periodo = 'SEMANA' | 'MES';

export interface Resumo {
  treinos: number;
  minutos: number;
  series: number;
  xp: number;
  repsPesoCorporal: number;
}

const mesCurto = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

/** [início, fim) do período que contém a data: semana de segunda a domingo ou mês civil (fuso do aparelho). */
export function limitesDoPeriodo(periodo: Periodo, data: Date): { inicio: Date; fim: Date } {
  if (periodo === 'MES') {
    return {
      inicio: new Date(data.getFullYear(), data.getMonth(), 1),
      fim: new Date(data.getFullYear(), data.getMonth() + 1, 1),
    };
  }
  const desdeSegunda = (data.getDay() + 6) % 7;
  const inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate() - desdeSegunda);
  return { inicio, fim: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7) };
}

/** Só treinos concluídos entram: treino abandonado não conta. */
export function resumirPeriodo(sessoes: SessaoResumo[], periodo: Periodo, data: Date): Resumo {
  const { inicio, fim } = limitesDoPeriodo(periodo, data);
  const resumo: Resumo = { treinos: 0, minutos: 0, series: 0, xp: 0, repsPesoCorporal: 0 };
  for (const s of sessoes) {
    const quando = new Date(s.iniciadaEm).getTime();
    if (s.estado !== 'CONCLUIDA' || quando < inicio.getTime() || quando >= fim.getTime()) continue;
    resumo.treinos++;
    resumo.minutos += duracaoMinutos(s.iniciadaEm, s.finalizadaEm);
    resumo.series += s.seriesConcluidas;
    resumo.xp += s.xpGanho;
    resumo.repsPesoCorporal += s.repsPesoCorporal ?? 0;
  }
  return resumo;
}

/** Ex.: "5 a 11 out", "28 set a 4 out" ou "outubro de 2026". */
export function rotuloDoPeriodo(periodo: Periodo, data: Date): string {
  if (periodo === 'MES') return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const { inicio } = limitesDoPeriodo('SEMANA', data);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
  return inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} a ${fim.getDate()} ${mesCurto(fim)}`
    : `${inicio.getDate()} ${mesCurto(inicio)} a ${fim.getDate()} ${mesCurto(fim)}`;
}

/** Quanto do histórico precisa estar carregado para o resumo da semana e do mês ficarem completos. */
export function inicioDaCobertura(data: Date): Date {
  const semana = limitesDoPeriodo('SEMANA', data).inicio;
  const mes = limitesDoPeriodo('MES', data).inicio;
  return semana < mes ? semana : mes;
}

/** "45" + "min", ou "2h10" sem unidade; no card a unidade vai menor para caber em 4 colunas. */
export function partesDoTempo(minutos: number): { valor: string; unidade: string } {
  if (minutos < 60) return { valor: String(minutos), unidade: 'min' };
  return { valor: `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`, unidade: '' };
}
