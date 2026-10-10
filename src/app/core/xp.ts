import { SessaoLocal } from './modelos';

const VOLUME_POR_XP = 40;
const XP_MINIMO_SERIE = 5;
const XP_MAXIMO_SERIE = 100;
const SERIES_MINIMAS = 3;

/** Espelha a regra da API (volume ÷ 40, entre 5 e 100) para mostrar uma estimativa antes de concluir. */
export function xpDaSerie(carga: number | null, reps: number | null): number {
  if (reps === null || reps < 1) return 0;
  const xp = Math.round(((carga ?? 0) * reps) / VOLUME_POR_XP);
  return Math.min(XP_MAXIMO_SERIE, Math.max(XP_MINIMO_SERIE, xp));
}

/** XP estimado das séries concluídas; não conta recorde nem o limite de um treino por dia (isso é da API). */
export function xpEstimado(sessao: SessaoLocal): number {
  const concluidas = sessao.exercicios.flatMap(e => e.series).filter(s => s.concluida);
  if (concluidas.length < SERIES_MINIMAS) return 0;
  return concluidas.reduce((total, s) => total + xpDaSerie(s.carga, s.reps), 0);
}
