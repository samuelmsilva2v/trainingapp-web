export type Objetivo = 'HIPERTROFIA' | 'FORCA' | 'RESISTENCIA' | 'EMAGRECIMENTO' | 'SAUDE_GERAL';

export type GrupoMuscular =
  | 'PEITO' | 'COSTAS' | 'LOMBAR' | 'TRAPEZIO' | 'OMBROS' | 'BICEPS' | 'TRICEPS' | 'ANTEBRACO'
  | 'ABDOMEN' | 'QUADRICEPS' | 'POSTERIORES' | 'GLUTEOS' | 'ADUTORES' | 'ABDUTORES'
  | 'PANTURRILHA' | 'PESCOCO' | 'CORPO_INTEIRO' | 'CARDIO';

export type Equipamento =
  | 'BARRA' | 'HALTERES' | 'MAQUINA' | 'CABO' | 'PESO_CORPORAL' | 'KETTLEBELL' | 'ELASTICO' | 'OUTRO';

export interface Exercicio {
  id: string;
  nome: string;
  grupoMuscular: GrupoMuscular;
  equipamento: Equipamento;
  personalizado: boolean;
}

export interface PlanoResumo {
  id: string;
  nome: string;
  objetivo: Objetivo;
  ativo: boolean;
  quantidadeDias: number;
}

export interface ItemPlano {
  id?: string;
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular: GrupoMuscular;
  equipamento: Equipamento;
  series: number;
  repsMin: number;
  repsMax: number;
  cargaAlvo: number | null;
  descansoSegundos: number | null;
}

export interface DiaPlano {
  id?: string;
  nome: string;
  exercicios: ItemPlano[];
}

export interface Plano {
  id: string;
  nome: string;
  objetivo: Objetivo;
  ativo: boolean;
  dias: DiaPlano[];
}

export interface PlanoRequest {
  nome: string;
  objetivo: Objetivo;
  dias: {
    nome: string;
    exercicios: {
      exercicioId: string;
      series: number;
      repsMin: number;
      repsMax: number;
      cargaAlvo: number | null;
      descansoSegundos: number | null;
    }[];
  }[];
}

export type EstadoSessao = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ABANDONADA';

export interface DiaHoje {
  id: string;
  nome: string;
  ordem: number;
  exercicios: ItemPlano[];
}

export interface Hoje {
  planoId: string | null;
  planoNome: string | null;
  totalDias: number;
  proximoDia: DiaHoje | null;
  sessaoEmAndamento: SessaoLocal | null;
}

export interface SerieLocal {
  id: string;
  reps: number | null;
  carga: number | null;
  concluida: boolean;
}

export interface ExercicioLocal {
  id: string;
  exercicioId: string;
  nome: string;
  grupoMuscular: GrupoMuscular;
  equipamento: Equipamento;
  metaSeries: number;
  metaRepsMin: number;
  metaRepsMax: number;
  metaCarga: number | null;
  metaDescansoSegundos: number | null;
  series: SerieLocal[];
}

/** Sessão como o cliente a mantém: é o mesmo documento que a API aceita (PUT) e devolve. */
export interface SessaoLocal {
  id: string;
  planoId: string | null;
  planoNome: string;
  diaNome: string;
  diaOrdem: number;
  estado: EstadoSessao;
  iniciadaEm: string;
  finalizadaEm: string | null;
  atualizadoEm: string;
  exercicios: ExercicioLocal[];
  /** Só a API preenche, depois de concluir a sessão. */
  xpGanho?: number;
  xpSessao?: number;
  xpSeries?: number;
  xpRecordes?: number;
  recordes?: string[];
}

export interface SessaoResumo {
  id: string;
  planoNome: string;
  diaNome: string;
  estado: EstadoSessao;
  iniciadaEm: string;
  finalizadaEm: string | null;
  exercicios: number;
  seriesConcluidas: number;
  volumeKg: number;
  xpGanho: number;
  recordes: number;
}

export interface Perfil {
  nome: string;
  fusoHorario: string;
}

export interface Conquista {
  codigo: string;
  nome: string;
  descricao: string;
  conquistada: boolean;
}

export interface Gamificacao {
  xpTotal: number;
  nivel: number;
  xpInicioDoNivel: number;
  xpProximoNivel: number;
  streakAtual: number;
  melhorStreak: number;
  treinos: number;
  recordes: number;
  treinouHoje: boolean;
  conquistas: Conquista[];
}
