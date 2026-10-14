import { limparCarga, passoCarga } from './carga';

describe('carga', () => {
  it('o "+/−" anda de 2,5 em 2,5 kg', () => {
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

  it('a carga digitada fica com até 2 casas, entre 0 e o máximo', () => {
    expect(limparCarga(21.25)).toBe(21.25);
    expect(limparCarga(11.256)).toBe(11.26);
    expect(limparCarga(-3)).toBe(0);
    expect(limparCarga(20000)).toBe(9999.99);
  });
});
