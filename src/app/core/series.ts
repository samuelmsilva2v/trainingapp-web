import { ExercicioLocal, SerieLocal, SessaoLocal, TipoSerie } from './modelos';

/** Máximo de drops depois de uma série, no plano e na execução (igual à API). */
export const MAX_DROPS = 3;

/** Uma série normal e os drops logo depois dela, por índice em `series`: o drop-set conta como uma série só. */
export interface Bloco {
  inicio: number;
  drops: number[];
}

export function ehDrop(serie: { tipo?: TipoSerie }): boolean {
  return serie.tipo === 'DROP';
}

/** Um drop sem série normal antes dele não forma bloco (a API o rejeita). */
export function blocos(series: readonly { tipo?: TipoSerie }[]): Bloco[] {
  const lista: Bloco[] = [];
  series.forEach((s, i) => {
    if (!ehDrop(s)) lista.push({ inicio: i, drops: [] });
    else if (lista.length > 0) lista[lista.length - 1].drops.push(i);
  });
  return lista;
}

/** Os drops seguem o check da série normal do bloco; drop sem repetição não conta (a API grava igual). */
export function espelharDrops(series: SerieLocal[]): SerieLocal[] {
  let concluido = false;
  return series.map(s => {
    if (!ehDrop(s)) {
      concluido = s.concluida;
      return s;
    }
    const concluida = concluido && (s.reps ?? 0) >= 1;
    return s.concluida === concluida ? s : { ...s, concluida };
  });
}

/**
 * Carga sugerida do drop: 80% da etapa anterior no múltiplo de 5 mais próximo, sempre abaixo dela
 * (100 → 80 → 65 → 50; 20 → 15; 10 → 5). Etapa anterior vazia ou de até 5 kg: o drop começa vazio.
 */
export function cargaDoDrop(anterior: number | null): number | null {
  if (anterior === null || anterior <= 5) return null;
  let carga = Math.round((anterior * 0.8) / 5) * 5;
  if (carga >= anterior) carga -= 5;
  return carga > 0 ? carga : null;
}

/** Reps sugeridas do drop: 2 a menos que a etapa anterior (8 → 6 → 4), no mínimo 1; anterior vazia, o drop começa vazio. */
export function repsDoDrop(anterior: number | null): number | null {
  return anterior === null ? null : Math.max(1, anterior - 2);
}

/** Ids (da linha do exercício) que levam o 🏆: o recorde vale uma vez por exercício, na primeira linha em que ele aparece. */
export function linhasComRecorde(sessao: SessaoLocal): Set<string> {
  const recordes = sessao.recordes ?? [];
  return new Set(
    sessao.exercicios
      .filter((e, i) => recordes.includes(e.exercicioId) && sessao.exercicios.findIndex(x => x.exercicioId === e.exercicioId) === i)
      .map(e => e.id),
  );
}

/** XP do treino em si (séries e recordes): sequência, conquistas e desafios aparecem à parte em todas as telas. */
export function xpDoTreino(s: { xpGanho?: number; xpStreak?: number; xpConquistas?: number; xpDesafios?: number }): number {
  return (s.xpGanho ?? 0) - (s.xpStreak ?? 0) - (s.xpConquistas ?? 0) - (s.xpDesafios ?? 0);
}

/** Séries (blocos) concluídas: o drop-set conta uma vez. */
export function seriesFeitas(exercicio: ExercicioLocal): number {
  return blocos(exercicio.series).filter(b => exercicio.series[b.inicio].concluida).length;
}

/** Séries (blocos) do exercício: o drop-set conta uma vez. */
export function totalSeries(exercicio: ExercicioLocal): number {
  return blocos(exercicio.series).length;
}
