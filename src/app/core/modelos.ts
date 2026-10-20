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
  /** Fotos da posição inicial e final; vazio nos exercícios do usuário. */
  imagens: string[];
}

/** Corpo do POST /api/exercicios (exercício próprio do usuário). */
export interface ExercicioRequest {
  nome: string;
  grupoMuscular: GrupoMuscular;
  equipamento: Equipamento;
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
  /** Só a API preenche (ou o seletor, ao adicionar um exercício). */
  imagens?: string[];
  series: number;
  repsMin: number;
  repsMax: number;
  cargaAlvo: number | null;
  descansoSegundos: number | null;
  /** Drops (0 a 3) depois de cada série (0 = séries normais); ausente vale 0. */
  drops?: number;
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
      drops: number;
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

/** NORMAL abre um bloco; DROP é uma etapa do drop-set da série normal logo antes (o bloco é uma série só). */
export type TipoSerie = 'NORMAL' | 'DROP';

export interface SerieLocal {
  id: string;
  reps: number | null;
  carga: number | null;
  /** O concluido de um drop segue o da série normal do bloco. */
  concluida: boolean;
  /** Ausente vale NORMAL. */
  tipo?: TipoSerie;
}

export interface ExercicioLocal {
  id: string;
  exercicioId: string;
  nome: string;
  grupoMuscular: GrupoMuscular;
  equipamento: Equipamento;
  /** Só a API preenche; o cliente apenas repassa. */
  imagens?: string[];
  metaSeries: number;
  metaRepsMin: number;
  metaRepsMax: number;
  metaCarga: number | null;
  metaDescansoSegundos: number | null;
  /** Snapshot dos drops planejados em cada série. */
  metaDrops?: number;
  series: SerieLocal[];
  /** Só a API preenche: XP das séries concluídas deste exercício. */
  xp?: number;
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
  xpSeries?: number;
  xpRecordes?: number;
  recordes?: string[];
}

/** Séries concluídas de um exercício no último treino concluído em que ele apareceu. */
export interface Anterior {
  exercicioId: string;
  sessaoId: string;
  iniciadaEm: string;
  series: { ordem: number; reps: number | null; carga: number | null; tipo?: TipoSerie }[];
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
  email: string;
  /** Falso em conta criada só pelo Google: não há senha para trocar. */
  temSenha: boolean;
  /** A cada quantos dias lembrar de se pesar (7, 15 ou 30); null = desligado. */
  lembretePesoDias: number | null;
}

export interface PerfilRequest {
  nome: string;
  lembretePesoDias: number | null;
}

/** Token de acesso (Bearer) e quantos segundos ele ainda vale. O refresh fica num cookie HttpOnly. */
export interface Acesso {
  acesso: string;
  expiraEmSegundos: number;
  /** Só no app Android (no navegador o refresh vem no cookie). */
  refresh?: string;
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

/** Uma pesagem por dia; `data` é o dia (AAAA-MM-DD). */
export interface Peso {
  data: string;
  kg: number;
}
