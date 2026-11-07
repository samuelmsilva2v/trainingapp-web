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
 * Um drop editado desce do mesmo jeito: vai para o drop da mesma posição nos blocos seguintes não concluídos, e os drops
 * depois dele, em cada bloco, seguem em cadeia.
 */
export function editarSerie(series: SerieLocal[], indice: number, nova: SerieLocal): SerieLocal[] {
  const lista = series.map((s, i) => (i === indice ? nova : s));
  const todos = blocos(lista);
  const k = todos.findIndex(b => b.inicio === indice || b.drops.includes(indice));
  if (k === -1) return lista;
  const pos = todos[k].drops.indexOf(indice); // -1: série normal
  for (const campo of ['carga', 'reps'] as const) {
    if (series[indice][campo] === nova[campo]) continue;
    todos.forEach((bloco, j) => {
      if (j < k || (j > k && lista[bloco.inicio].concluida)) return;
      const alvo = pos === -1 ? bloco.inicio : bloco.drops[pos];
      if (alvo === undefined) return;
      lista[alvo] = { ...lista[alvo], [campo]: nova[campo] };
      seguirDrops(lista, bloco.drops.slice(pos + 1), campo, series[alvo][campo], nova[campo]);
    });
  }
  return lista;
}

/** Recalcula em cadeia os drops dados, a partir da etapa antes deles, que foi de `antigoAntes` para `novoAntes`. */
function seguirDrops(lista: SerieLocal[], drops: number[], campo: 'carga' | 'reps', antigoAntes: number | null, novoAntes: number | null): void {
  let antigo = antigoAntes;
  let novo = novoAntes;
  for (const d of drops) {
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
