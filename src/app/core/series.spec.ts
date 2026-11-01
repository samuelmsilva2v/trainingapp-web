import { blocos, cargaDoDrop, espelharDrops, linhasComRecorde, repsDoDrop, seriesFeitas, totalSeries, xpDoTreino } from './series';
import { ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

const exercicio = (series: SerieLocal[]): ExercicioLocal => ({
  id: 'e', exercicioId: 'x', nome: 'Supino', grupoMuscular: 'PEITO', equipamento: 'BARRA',
  metaSeries: 3, metaRepsMin: 8, metaRepsMax: 12, metaCarga: 60, metaDescansoSegundos: null, series,
});

describe('séries', () => {
  it('o recorde (🏆) vale só na primeira linha em que o exercício aparece', () => {
    const linha = (id: string, exercicioId: string) => ({ ...exercicio([]), id, exercicioId });
    const s = { recordes: ['supino'], exercicios: [linha('a', 'supino'), linha('b', 'remada'), linha('c', 'supino')] } as unknown as SessaoLocal;
    expect([...linhasComRecorde(s)]).toEqual(['a']);
    expect(linhasComRecorde({ exercicios: s.exercicios } as SessaoLocal).size).toBe(0);
  });

  const s = (concluida: boolean, reps: number | null, tipo: 'NORMAL' | 'DROP' = 'NORMAL'): SerieLocal =>
    ({ id: Math.random().toString(), reps, carga: 60, concluida, tipo });

  it('agrupa cada série normal com os drops logo depois dela', () => {
    const series = [s(true, 10), s(true, 10), s(false, 8, 'DROP'), s(false, 6, 'DROP'), s(false, 10)];
    expect(blocos(series)).toEqual([{ inicio: 0, drops: [] }, { inicio: 1, drops: [2, 3] }, { inicio: 4, drops: [] }]);
    expect(totalSeries(exercicio(series))).toBe(3);
    expect(seriesFeitas(exercicio(series))).toBe(2); // o drop-set conta uma vez
    expect(blocos([s(false, 8, 'DROP')])).toEqual([]); // drop sem série antes não forma bloco
  });

  it('o drop segue o check da série normal, e drop sem repetição não conta', () => {
    const [, d1, d2, , d3] = espelharDrops([s(true, 10), s(false, 8, 'DROP'), s(false, null, 'DROP'), s(false, 10), s(true, 6, 'DROP')]);
    expect([d1.concluida, d2.concluida, d3.concluida]).toEqual([true, false, false]);
  });

  it('reps do drop: 2 a mais que a etapa anterior (6 × 30 → 8 × 25 → 10 × 20)', () => {
    expect(repsDoDrop(6)).toBe(8);
    expect(repsDoDrop(8)).toBe(10);
    expect(repsDoDrop(null)).toBeNull();
  });

  it('carga do drop: 80% da anterior no múltiplo de 5 mais próximo, sempre abaixo dela', () => {
    expect(cargaDoDrop(100)).toBe(80);
    expect(cargaDoDrop(80)).toBe(65);
    expect(cargaDoDrop(65)).toBe(50);
    expect(cargaDoDrop(22.5)).toBe(20);
    expect(cargaDoDrop(20)).toBe(15);
    expect(cargaDoDrop(10)).toBe(5);
    expect(cargaDoDrop(5)).toBeNull();
    expect(cargaDoDrop(null)).toBeNull();
  });
});

describe('xpDoTreino', () => {
  it('desconta o bônus da sequência do XP ganho', () => {
    expect(xpDoTreino({ xpGanho: 51, xpStreak: 15 })).toBe(36);
    expect(xpDoTreino({ xpGanho: 101, xpStreak: 15, xpConquistas: 50 })).toBe(36);
    expect(xpDoTreino({ xpGanho: 121, xpStreak: 15, xpConquistas: 50, xpDesafios: 20 })).toBe(36);
    expect(xpDoTreino({ xpGanho: 36 })).toBe(36); // API antiga ou sem bônus
    expect(xpDoTreino({})).toBe(0);
  });
});
