import { ExercicioLocal, SerieLocal, SessaoLocal, SessaoResumo } from './modelos';

export function volumeDasSeries(series: SerieLocal[]): number {
  return series.filter(s => s.concluida).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0);
}

export function volumeTotal(sessao: SessaoLocal): number {
  return sessao.exercicios.reduce((v, e) => v + volumeDasSeries(e.series), 0);
}

/**
 * Coeficiente de carga: volume realizado ÷ volume planejado (séries × carga alvo × reps mínimas),
 * só nos exercícios que têm carga alvo. 1,00 = meta cumprida; null quando nada tem carga alvo.
 */
export function coeficienteDeCarga(sessao: SessaoLocal): number | null {
  const comMeta = sessao.exercicios.filter(e => (e.metaCarga ?? 0) > 0);
  const planejado = comMeta.reduce((v, e) => v + e.metaSeries * (e.metaCarga ?? 0) * e.metaRepsMin, 0);
  if (planejado === 0) return null;
  return comMeta.reduce((v, e) => v + volumeDasSeries(e.series), 0) / planejado;
}

/** Volume desta sessão ÷ volume do último treino concluído do mesmo dia da rotação; null sem base. */
export function comparacaoComUltimo(sessao: SessaoLocal, historico: SessaoResumo[]): number | null {
  const anterior = historico.find(
    s => s.estado === 'CONCLUIDA' && s.id !== sessao.id && s.diaNome === sessao.diaNome &&
      s.planoNome === sessao.planoNome && s.volumeKg > 0,
  );
  return anterior ? volumeTotal(sessao) / anterior.volumeKg : null;
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
