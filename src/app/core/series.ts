import { Equipamento, ExercicioLocal, SerieLocal, SessaoLocal, TipoSerie } from './modelos';

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

/**
 * Reps sugeridas do drop: 2 a mais que a etapa anterior (6 → 8 → 10), porque a carga cai; a 1ª etapa é a mais pesada
 * e com menos reps (web#59). Anterior vazia, o drop começa vazio.
 */
export function repsDoDrop(anterior: number | null): number | null {
  return anterior === null ? null : anterior + 2;
}

const SUGESTAO = { carga: cargaDoDrop, reps: repsDoDrop };

/**
 * Troca a série `indice` por `nova`. A carga ou as reps que mudaram numa série normal descem para todas as séries
 * normais seguintes ainda não concluídas, mesmo as que já tinham valor (web#67). Em cada bloco alterado, os drops seguem
 * a série (web#63): o drop vazio ou ainda igual à sugestão do valor antigo recebe a sugestão do novo, em cadeia; drop editado fica.
 */
export function editarSerie(series: SerieLocal[], indice: number, nova: SerieLocal): SerieLocal[] {
  const lista = series.map((s, i) => (i === indice ? nova : s));
  if (ehDrop(nova)) return lista;
  for (const campo of ['carga', 'reps'] as const) {
    if (series[indice][campo] === nova[campo]) continue;
    for (const bloco of blocos(lista)) {
      if (bloco.inicio < indice || (bloco.inicio > indice && lista[bloco.inicio].concluida)) continue;
      lista[bloco.inicio] = { ...lista[bloco.inicio], [campo]: nova[campo] };
      seguirDrops(lista, bloco, campo, series[bloco.inicio][campo]);
    }
  }
  return lista;
}

/** Recalcula em cadeia os drops do bloco, a partir do valor antigo da série normal (já trocada em `lista`). */
function seguirDrops(lista: SerieLocal[], bloco: Bloco, campo: 'carga' | 'reps', antigoDaSerie: number | null): void {
  let antigo = antigoDaSerie;
  let novo = lista[bloco.inicio][campo];
  for (const d of bloco.drops) {
    const atual = lista[d][campo];
    const valor = atual === null || atual === SUGESTAO[campo](antigo) ? SUGESTAO[campo](novo) : atual;
    lista[d] = { ...lista[d], [campo]: valor };
    antigo = atual;
    novo = valor;
  }
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

/** Peso corporal (api#43): só reps; sem carga, sem drop-set. */
export function ehPesoCorporal(exercicio: { equipamento: Equipamento }): boolean {
  return exercicio.equipamento === 'PESO_CORPORAL';
}

/** Reps concluídas nos exercícios de peso corporal, que ficam fora do volume (como `repsPesoCorporal` da API). */
export function repsPesoCorporal(sessao: SessaoLocal): number {
  return sessao.exercicios
    .filter(ehPesoCorporal)
    .flatMap(e => e.series)
    .reduce((n, s) => n + (s.concluida ? s.reps ?? 0 : 0), 0);
}

/** Séries (blocos) do exercício: o drop-set conta uma vez. */
export function totalSeries(exercicio: ExercicioLocal): number {
  return blocos(exercicio.series).length;
}
