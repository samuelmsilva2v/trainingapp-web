import { ExercicioLocal, SessaoLocal } from './modelos';

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
