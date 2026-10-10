import { ItemPlano } from '../../core/modelos';
import { definirCampo } from './plano-editor';

const item = {
  exercicioId: 'x',
  series: 3,
  repsMin: 8,
  repsMax: 12,
  cargaAlvo: 60,
  descansoSegundos: 90,
} as ItemPlano;

describe('definirCampo', () => {
  it('guarda a carga digitada com até 2 casas e limita a 9999,99', () => {
    expect(definirCampo(item, 'cargaAlvo', 47.5).cargaAlvo).toBe(47.5);
    expect(definirCampo(item, 'cargaAlvo', 11.256).cargaAlvo).toBe(11.26);
    expect(definirCampo(item, 'cargaAlvo', 20000).cargaAlvo).toBe(9999.99);
  });

  it('carga vazia ou zero vira sem carga alvo', () => {
    expect(definirCampo(item, 'cargaAlvo', null).cargaAlvo).toBeNull();
    expect(definirCampo(item, 'cargaAlvo', 0).cargaAlvo).toBeNull();
  });

  it('limita séries, reps e descanso aos valores da API', () => {
    expect(definirCampo(item, 'series', 99).series).toBe(20);
    expect(definirCampo(item, 'series', 0).series).toBe(1);
    expect(definirCampo(item, 'repsMax', 500).repsMax).toBe(100);
    expect(definirCampo(item, 'descansoSegundos', 5000).descansoSegundos).toBe(1800);
    expect(definirCampo(item, 'descansoSegundos', 0).descansoSegundos).toBeNull();
  });

  it('reps mínimas nunca passam das máximas (e vice-versa)', () => {
    const subiu = definirCampo(item, 'repsMin', 20);
    expect(subiu.repsMin).toBe(20);
    expect(subiu.repsMax).toBe(20);
    const desceu = definirCampo(item, 'repsMax', 5);
    expect(desceu.repsMax).toBe(5);
    expect(desceu.repsMin).toBe(5);
  });
});
