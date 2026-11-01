import { Anterior, Exercicio, ExercicioLocal, SerieLocal, TipoSerie } from './modelos';
import { trocarExercicio } from './troca';

let n = 0;
const nova = (reps: number | null, carga: number | null, tipo: TipoSerie): SerieLocal =>
  ({ id: `s${n++}`, reps, carga, concluida: false, tipo });

const original: ExercicioLocal = {
  id: 'linha1', exercicioId: 'remada-polia', nome: 'Remada na polia', grupoMuscular: 'COSTAS', equipamento: 'CABO',
  imagens: ['a.jpg'], metaSeries: 3, metaRepsMin: 8, metaRepsMax: 12, metaCarga: 60, metaDescansoSegundos: 90, metaDrops: 0,
  series: [nova(8, 60, 'NORMAL'), nova(8, 60, 'NORMAL'), nova(8, 60, 'NORMAL')],
};
const curvada: Exercicio = {
  id: 'remada-curvada', nome: 'Remada curvada', grupoMuscular: 'COSTAS', equipamento: 'BARRA', personalizado: false, imagens: ['b.jpg'],
};
const anterior = (series: Anterior['series']): Anterior => ({ exercicioId: curvada.id, sessaoId: 'x', iniciadaEm: '', series });

describe('trocarExercicio', () => {
  it('troca o exercício, mantém linha, séries e descanso e tira a carga alvo do original', () => {
    const r = trocarExercicio(original, curvada, { drops: 0, reps: 8 }, undefined, nova);
    expect([r.id, r.exercicioId, r.nome, r.equipamento, r.imagens]).toEqual(['linha1', 'remada-curvada', 'Remada curvada', 'BARRA', ['b.jpg']]);
    expect([r.metaRepsMin, r.metaRepsMax, r.metaCarga, r.metaDescansoSegundos, r.metaDrops]).toEqual([8, 12, null, 90, 0]);
    // Nunca feito: cargas vazias, reps da meta.
    expect(r.series.map(s => [s.tipo, s.reps, s.carga])).toEqual([['NORMAL', 8, null], ['NORMAL', 8, null], ['NORMAL', 8, null]]);
  });

  it('cada série começa com a carga da mesma posição no último treino; as que sobram repetem a última', () => {
    const r = trocarExercicio(original, curvada, { drops: 0, reps: 8 }, anterior([
      { ordem: 0, reps: 10, carga: 50, tipo: 'NORMAL' }, { ordem: 1, reps: 8, carga: 55, tipo: 'NORMAL' },
    ]), nova);
    expect(r.series.map(s => s.carga)).toEqual([50, 55, 55]);
  });

  it('com drop-set, as reps da 1ª etapa caem de 2 em 2 e o drop usa o do último treino ou 80% em cadeia', () => {
    const r = trocarExercicio({ ...original, series: original.series.slice(0, 2) }, curvada, { drops: 2, reps: 10 }, anterior([
      { ordem: 0, reps: 10, carga: 60, tipo: 'NORMAL' }, { ordem: 1, reps: 8, carga: 45, tipo: 'DROP' },
    ]), nova);
    expect([r.metaRepsMin, r.metaRepsMax, r.metaDrops]).toEqual([10, 10, 2]);
    expect(r.series.map(s => [s.tipo, s.reps, s.carga])).toEqual([
      ['NORMAL', 10, 60], ['DROP', 8, 45], ['DROP', 6, 35],
      ['NORMAL', 10, 60], ['DROP', 8, 50], ['DROP', 6, 40],
    ]);
  });

  it('um original drop-set que vira normal mantém as reps únicas como meta', () => {
    const drop: ExercicioLocal = {
      ...original, metaRepsMin: 10, metaRepsMax: 10, metaDrops: 1,
      series: [nova(10, 60, 'NORMAL'), nova(8, 50, 'DROP'), nova(10, 60, 'NORMAL'), nova(8, 50, 'DROP')],
    };
    const r = trocarExercicio(drop, curvada, { drops: 0, reps: 10 }, undefined, nova);
    expect([r.metaRepsMin, r.metaRepsMax, r.metaDrops]).toEqual([10, 10, 0]);
    expect(r.series.map(s => s.tipo)).toEqual(['NORMAL', 'NORMAL']); // 2 séries (blocos), sem drops
  });
});

describe('trocarExercicio: peso corporal', () => {
  const barra: Exercicio = {
    id: 'barra-fixa', nome: 'Barra fixa', grupoMuscular: 'COSTAS', equipamento: 'PESO_CORPORAL', personalizado: false, imagens: [],
  };

  it('para um de peso corporal, descarta as cargas (inclusive as do último treino) e não há drop-set', () => {
    const r = trocarExercicio(original, barra, { drops: 2, reps: 10 }, {
      exercicioId: barra.id, sessaoId: 'x', iniciadaEm: '', series: [{ ordem: 0, reps: 12, carga: 20, tipo: 'NORMAL' }],
    }, nova);
    expect([r.equipamento, r.metaCarga, r.metaDrops]).toEqual(['PESO_CORPORAL', null, 0]);
    expect(r.series.map(s => [s.tipo, s.reps, s.carga])).toEqual([['NORMAL', 8, null], ['NORMAL', 8, null], ['NORMAL', 8, null]]);
  });

  it('de peso corporal para um com carga, segue a regra de sempre (cargas do último treino)', () => {
    const deBarra: ExercicioLocal = { ...original, equipamento: 'PESO_CORPORAL', metaCarga: null, series: original.series.map(s => ({ ...s, carga: null })) };
    const r = trocarExercicio(deBarra, curvada, { drops: 0, reps: 8 }, anterior([{ ordem: 0, reps: 10, carga: 50, tipo: 'NORMAL' }]), nova);
    expect(r.series.map(s => s.carga)).toEqual([50, 50, 50]);
  });
});
