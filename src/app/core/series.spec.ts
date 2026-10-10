import { volumeTotal } from './series';
import { ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

const serie = (reps: number, carga: number, concluida = true): SerieLocal => ({ id: `${reps}-${carga}`, reps, carga, concluida });

const exercicio = (series: SerieLocal[]): ExercicioLocal => ({
  id: 'e', exercicioId: 'x', nome: 'Supino', grupoMuscular: 'PEITO', equipamento: 'BARRA',
  metaSeries: 3, metaRepsMin: 8, metaRepsMax: 12, metaCarga: 60, metaDescansoSegundos: null, series,
});

describe('séries', () => {
  it('o volume soma carga × reps só das séries concluídas', () => {
    const s = { exercicios: [exercicio([serie(10, 60), serie(10, 60), serie(10, 60, false)])] } as SessaoLocal;
    expect(volumeTotal(s)).toBe(1200);
  });
});
