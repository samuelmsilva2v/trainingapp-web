import { SessaoLocal } from './modelos';
import { xpDaSerie, xpEstimado } from './xp';

const sessaoCom = (series: { reps: number | null; carga: number | null; concluida: boolean }[]) =>
  ({ exercicios: [{ series: series.map((s, i) => ({ id: String(i), ...s })) }] }) as unknown as SessaoLocal;

describe('xp', () => {
  it('a série rende volume ÷ 40, entre 5 e 100', () => {
    expect(xpDaSerie(60, 10)).toBe(15);
    expect(xpDaSerie(10, 8)).toBe(5);
    expect(xpDaSerie(null, 20)).toBe(5);
    expect(xpDaSerie(300, 30)).toBe(100);
    expect(xpDaSerie(60, 0)).toBe(0);
  });

  it('a estimativa soma só as séries concluídas e exige 3 séries', () => {
    const feita = { reps: 10, carga: 60, concluida: true };
    expect(xpEstimado(sessaoCom([feita, feita, { ...feita, concluida: false }]))).toBe(0);
    expect(xpEstimado(sessaoCom([feita, feita, feita, { ...feita, concluida: false }]))).toBe(45);
  });
});
