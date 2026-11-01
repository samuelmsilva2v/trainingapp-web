import { ExercicioLocal, ItemPlano, Plano, PlanoRequest, SessaoLocal } from './modelos';
import { blocos } from './series';

/** Uma linha da lista "Mudanças no plano". */
export interface Mudanca {
  icone: 'sync_alt' | 'add' | 'remove' | 'trending_down';
  texto: string;
}

export interface MudancasDoPlano {
  mudancas: Mudanca[];
  /** O plano inteiro para o PUT, com o dia do treino atualizado. */
  plano: PlanoRequest;
}

const CHAVE_AUTOMATICO = 'trainingapp.salvarNoPlano';

/** "Salvar mudanças do treino no plano" (Configurações): guardado só no aparelho, desligado por padrão. */
export function salvarNoPlanoLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE_AUTOMATICO) === 'ligado';
  } catch {
    return false;
  }
}

export function salvarSalvarNoPlano(ligado: boolean): void {
  try {
    if (ligado) localStorage.setItem(CHAVE_AUTOMATICO, 'ligado');
    else localStorage.removeItem(CHAVE_AUTOMATICO);
  } catch {
    // sem armazenamento: vale só até fechar o app
  }
}

/**
 * O que mudou na estrutura do dia (troca de exercício, número de séries, drop-set) entre o plano e a sessão concluída,
 * e o plano novo com essas mudanças. Reps, carga alvo e descanso ficam os do plano (a carga alvo do exercício trocado
 * some: não serve para outro aparelho). Null quando não há o que oferecer: sessão não concluída, sem mudança, ou o
 * plano mudou desde o início do treino (a sessão guarda as metas do plano daquele momento; a troca reescreve as do
 * exercício trocado, por isso um exercício diferente na mesma posição conta como troca).
 */
export function mudancasDoPlano(sessao: SessaoLocal, plano: Plano): MudancasDoPlano | null {
  if (sessao.estado !== 'CONCLUIDA' || sessao.planoId !== plano.id) return null;
  const dia = plano.dias[sessao.diaOrdem];
  if (!dia || dia.exercicios.length !== sessao.exercicios.length) return null;
  if (!sessao.exercicios.every((ex, i) => mesmoPonto(dia.exercicios[i], ex))) return null;

  const mudancas: Mudanca[] = [];
  const itens = dia.exercicios.map((item, i) => {
    const ex = sessao.exercicios[i];
    const novo = { ...item, drops: item.drops ?? 0 };
    if (ex.exercicioId !== item.exercicioId) {
      mudancas.push({ icone: 'sync_alt', texto: `${item.exercicioNome} → ${ex.nome}` });
      Object.assign(novo, { exercicioId: ex.exercicioId, exercicioNome: ex.nome, cargaAlvo: null });
    }
    const series = blocos(ex.series).length;
    if (series > 0 && series !== item.series) {
      mudancas.push({ icone: series > item.series ? 'add' : 'remove', texto: `${ex.nome}: ${item.series} → ${series} séries` });
      novo.series = series;
    }
    const drops = dropsDaSessao(ex);
    if (drops !== novo.drops) {
      mudancas.push({ icone: 'trending_down', texto: `${ex.nome}: ${textoDrops(novo.drops, drops)}` });
      novo.drops = drops;
      // Drop-set tem reps únicas (as da primeira etapa), como no editor.
      if (drops > 0) novo.repsMax = novo.repsMin;
    }
    return novo;
  });
  if (mudancas.length === 0) return null;

  return {
    mudancas,
    plano: {
      nome: plano.nome,
      objetivo: plano.objetivo,
      dias: plano.dias.map((d, i) => ({
        nome: d.nome,
        exercicios: (i === sessao.diaOrdem ? itens : d.exercicios).map(it => ({
          exercicioId: it.exercicioId,
          series: it.series,
          repsMin: it.repsMin,
          repsMax: it.repsMax,
          cargaAlvo: it.cargaAlvo,
          descansoSegundos: it.descansoSegundos,
          drops: it.drops ?? 0,
        })),
      })),
    },
  };
}

/** O item do plano ainda é o que a sessão copiou ao começar. Séries e descanso a troca mantém; o resto, só sem troca. */
function mesmoPonto(item: ItemPlano, ex: ExercicioLocal): boolean {
  if (item.series !== ex.metaSeries || item.descansoSegundos !== ex.metaDescansoSegundos) return false;
  if (item.exercicioId !== ex.exercicioId) return true;
  return item.repsMin === ex.metaRepsMin && item.repsMax === ex.metaRepsMax && (item.drops ?? 0) === (ex.metaDrops ?? 0);
}

/** Drops por série: muda só se todas as séries ficaram com o mesmo número; um drop a menos numa série é cansaço. */
function dropsDaSessao(ex: ExercicioLocal): number {
  const porSerie = blocos(ex.series).map(b => b.drops.length);
  const planejado = ex.metaDrops ?? 0;
  return porSerie.length > 0 && porSerie.every(d => d === porSerie[0]) ? porSerie[0] : planejado;
}

function textoDrops(antes: number, depois: number): string {
  if (depois === 0) return 'drop-set desligado';
  if (antes === 0) return `drop-set ligado (${depois + 1} etapas)`;
  return `drop-set de ${antes + 1} → ${depois + 1} etapas`;
}
