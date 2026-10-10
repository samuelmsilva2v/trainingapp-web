import { ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

export function volumeDasSeries(series: SerieLocal[]): number {
  return series.filter(s => s.concluida).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0);
}

export function volumeTotal(sessao: SessaoLocal): number {
  return sessao.exercicios.reduce((v, e) => v + volumeDasSeries(e.series), 0);
}

/** Série concluída de maior carga (empate: mais reps). */
export function melhorSerie(exercicio: ExercicioLocal): SerieLocal | null {
  return exercicio.series
    .filter(s => s.concluida)
    .reduce<SerieLocal | null>((melhor, s) => {
      if (!melhor) return s;
      const c = (s.carga ?? 0) - (melhor.carga ?? 0);
      return c > 0 || (c === 0 && (s.reps ?? 0) > (melhor.reps ?? 0)) ? s : melhor;
    }, null);
}

export function seriesFeitas(exercicio: ExercicioLocal): number {
  return exercicio.series.filter(s => s.concluida).length;
}
