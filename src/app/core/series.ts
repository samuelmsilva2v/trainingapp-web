import { ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

export function volumeDasSeries(series: SerieLocal[]): number {
  return series.filter(s => s.concluida).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0);
}

export function volumeTotal(sessao: SessaoLocal): number {
  return sessao.exercicios.reduce((v, e) => v + volumeDasSeries(e.series), 0);
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

export function seriesFeitas(exercicio: ExercicioLocal): number {
  return exercicio.series.filter(s => s.concluida).length;
}
