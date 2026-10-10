import { linhasComRecorde } from './series';
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
});
