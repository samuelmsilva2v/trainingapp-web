import { lerPassoCarga, limparCarga, passoCarga, salvarPassoCarga } from './carga';

describe('carga', () => {
  beforeEach(() => localStorage.clear());

  it('o "+/−" anda de 2,5 em 2,5 kg por padrão', () => {
    expect(passoCarga(25, 1)).toBe(27.5);
    expect(passoCarga(25, -1)).toBe(22.5);
    expect(passoCarga(0, 1)).toBe(2.5);
    expect(passoCarga(0, -1)).toBe(0);
  });

  it('fora da grade, encaixa no próximo múltiplo de 2,5', () => {
    expect(passoCarga(23, 1)).toBe(25);
    expect(passoCarga(23, -1)).toBe(22.5);
    expect(passoCarga(21.25, 1)).toBe(22.5);
    expect(passoCarga(21.25, -1)).toBe(20);
  });

  it('passo de 1 kg: anda de 1 em 1 e encaixa a carga quebrada', () => {
    expect(passoCarga(20, 1, 1)).toBe(21);
    expect(passoCarga(20, -1, 1)).toBe(19);
    expect(passoCarga(22.5, 1, 1)).toBe(23);
    expect(passoCarga(22.5, -1, 1)).toBe(22);
    expect(passoCarga(0.5, -1, 1)).toBe(0);
  });

  it('passo de 5 kg: 22,5 → 25 → 30, e para baixo 22,5 → 20', () => {
    expect(passoCarga(22.5, 1, 5)).toBe(25);
    expect(passoCarga(25, 1, 5)).toBe(30);
    expect(passoCarga(22.5, -1, 5)).toBe(20);
    expect(passoCarga(0, 1, 5)).toBe(5);
  });

  it('o passo escolhido fica no aparelho e vale no "+/−"', () => {
    expect(lerPassoCarga()).toBe(2.5);
    salvarPassoCarga(5);
    expect(lerPassoCarga()).toBe(5);
    expect(passoCarga(22.5, 1)).toBe(25);
    localStorage.setItem('trainingapp.passoCarga', '3');
    expect(lerPassoCarga()).toBe(2.5);
  });

  it('a carga digitada fica com até 2 casas, entre 0 e o máximo', () => {
    expect(limparCarga(21.25)).toBe(21.25);
    expect(limparCarga(11.256)).toBe(11.26);
    expect(limparCarga(-3)).toBe(0);
    expect(limparCarga(20000)).toBe(9999.99);
  });
});
