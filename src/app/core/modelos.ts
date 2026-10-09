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
