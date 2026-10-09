import { Equipamento, GrupoMuscular, Objetivo } from './modelos';

export const OBJETIVOS: { valor: Objetivo; rotulo: string; icone: string }[] = [
  { valor: 'HIPERTROFIA', rotulo: 'Hipertrofia', icone: 'fitness_center' },
  { valor: 'FORCA', rotulo: 'Força', icone: 'bolt' },
  { valor: 'RESISTENCIA', rotulo: 'Resistência', icone: 'timer' },
  { valor: 'EMAGRECIMENTO', rotulo: 'Emagrecimento', icone: 'local_fire_department' },
  { valor: 'SAUDE_GERAL', rotulo: 'Saúde geral', icone: 'favorite' },
];

export const GRUPOS: { valor: GrupoMuscular; rotulo: string }[] = [
  { valor: 'PEITO', rotulo: 'Peito' },
  { valor: 'COSTAS', rotulo: 'Costas' },
  { valor: 'LOMBAR', rotulo: 'Lombar' },
  { valor: 'TRAPEZIO', rotulo: 'Trapézio' },
  { valor: 'OMBROS', rotulo: 'Ombros' },
  { valor: 'BICEPS', rotulo: 'Bíceps' },
  { valor: 'TRICEPS', rotulo: 'Tríceps' },
  { valor: 'ANTEBRACO', rotulo: 'Antebraço' },
  { valor: 'ABDOMEN', rotulo: 'Abdômen' },
  { valor: 'QUADRICEPS', rotulo: 'Quadríceps' },
  { valor: 'POSTERIORES', rotulo: 'Posteriores' },
  { valor: 'GLUTEOS', rotulo: 'Glúteos' },
  { valor: 'ADUTORES', rotulo: 'Adutores' },
  { valor: 'ABDUTORES', rotulo: 'Abdutores' },
  { valor: 'PANTURRILHA', rotulo: 'Panturrilha' },
  { valor: 'PESCOCO', rotulo: 'Pescoço' },
  { valor: 'CORPO_INTEIRO', rotulo: 'Corpo inteiro' },
  { valor: 'CARDIO', rotulo: 'Cardio' },
];

export const EQUIPAMENTOS: { valor: Equipamento; rotulo: string }[] = [
  { valor: 'BARRA', rotulo: 'Barra' },
  { valor: 'HALTERES', rotulo: 'Halteres' },
  { valor: 'MAQUINA', rotulo: 'Máquina' },
  { valor: 'CABO', rotulo: 'Cabo / Polia' },
  { valor: 'PESO_CORPORAL', rotulo: 'Peso corporal' },
  { valor: 'KETTLEBELL', rotulo: 'Kettlebell' },
  { valor: 'ELASTICO', rotulo: 'Elástico' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

export const rotuloObjetivo = (v: Objetivo) => OBJETIVOS.find(o => o.valor === v)?.rotulo ?? v;
export const rotuloGrupo = (v: GrupoMuscular) => GRUPOS.find(o => o.valor === v)?.rotulo ?? v;
export const rotuloEquipamento = (v: Equipamento) => EQUIPAMENTOS.find(o => o.valor === v)?.rotulo ?? v;
