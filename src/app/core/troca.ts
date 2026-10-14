import { Anterior, Exercicio, ExercicioLocal, SerieLocal, TipoSerie } from './modelos';
import { blocos, cargaDoDrop, repsDoDrop, totalSeries } from './series';

/** Como o exercício novo entra: drops = 0 é série normal; com drop-set, `reps` são as da primeira etapa. */
export interface ConfigTroca {
  drops: number;
  reps: number;
}

type NovaSerie = (reps: number | null, carga: number | null, tipo: TipoSerie) => SerieLocal;

/**
 * Troca o exercício só nesta sessão (o plano não muda). Ficam o id da linha, o número de séries e o descanso; as
 * séries são remontadas. A carga alvo do original não serve para outro aparelho: cada série começa com a carga da
 * mesma posição no último treino do exercício novo (as que sobram repetem a última) e cada drop com o drop
 * correspondente, ou 80% em cadeia; sem histórico, as cargas ficam vazias. Quem chama garante que não há série feita.
 */
export function trocarExercicio(
  ex: ExercicioLocal,
  novo: Exercicio,
  config: ConfigTroca,
  anterior: Anterior | undefined,
  novaSerie: NovaSerie,
): ExercicioLocal {
  // Drop-set tem reps únicas; um original drop-set que vira normal mantém as reps dele como meta (mín = máx).
  const [repsMin, repsMax] =
    config.drops > 0 ? [config.reps, config.reps] : (ex.metaDrops ?? 0) > 0 ? [ex.metaRepsMin, ex.metaRepsMin] : [ex.metaRepsMin, ex.metaRepsMax];
  const passadas = anterior?.series ?? [];
  const blocosPassados = blocos(passadas);
  const ultimaCarga = blocosPassados.length > 0 ? passadas[blocosPassados[blocosPassados.length - 1].inicio].carga : null;

  const series: SerieLocal[] = [];
  for (let k = 0; k < totalSeries(ex); k++) {
    const passado = blocosPassados[k];
    let carga = passado ? passadas[passado.inicio].carga : ultimaCarga;
    let reps: number | null = repsMin;
    series.push(novaSerie(reps, carga, 'NORMAL'));
    for (let d = 0; d < config.drops; d++) {
      const dropPassado = passado?.drops[d];
      carga = dropPassado !== undefined ? passadas[dropPassado].carga : cargaDoDrop(carga);
      reps = repsDoDrop(reps);
      series.push(novaSerie(reps, carga, 'DROP'));
    }
  }

  return {
    ...ex,
    exercicioId: novo.id,
    nome: novo.nome,
    grupoMuscular: novo.grupoMuscular,
    equipamento: novo.equipamento,
    imagens: novo.imagens,
    metaRepsMin: repsMin,
    metaRepsMax: repsMax,
    metaCarga: null,
    metaDrops: config.drops,
    series,
    xp: undefined,
  };
}
