import { ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

export function volumeDasSeries(series: SerieLocal[]): number {
  return series.filter(s => s.concluida).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0);
}

export function volumeTotal(sessao: SessaoLocal): number {
  return sessao.exercicios.reduce((v, e) => v + volumeDasSeries(e.series), 0);
}

export function seriesFeitas(exercicio: ExercicioLocal): number {
  return exercicio.series.filter(s => s.concluida).length;
}
