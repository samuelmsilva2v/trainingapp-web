import { diasEntre, hojeIso, pesagemPendente, tendencia } from './peso';

describe('peso', () => {
  it('tendência de série vazia é vazia e a de um ponto é o próprio peso', () => {
    expect(tendencia([])).toEqual([]);
    expect(tendencia([{ data: '2026-10-01', kg: 80 }])).toEqual([80]);
  });

  it('em dias seguidos, cada pesagem puxa 10% da diferença', () => {
    const t = tendencia([
      { data: '2026-10-01', kg: 80 },
      { data: '2026-10-02', kg: 90 },
      { data: '2026-10-03', kg: 90 },
    ]);
    expect(t[1]).toBeCloseTo(81);
    expect(t[2]).toBeCloseTo(81.9);
  });

  it('com intervalo irregular, a suavização vale pelos dias sem pesar', () => {
    const t = tendencia([
      { data: '2026-10-01', kg: 80 },
      { data: '2026-10-11', kg: 90 },
    ]);
    // 10 dias: 1 − 0,9¹⁰ ≈ 0,651
    expect(t[1]).toBeCloseTo(80 + 10 * (1 - 0.9 ** 10));
  });

  it('conta dias entre datas mesmo na virada do horário de verão', () => {
    expect(diasEntre('2026-10-01', '2026-10-31')).toBe(30);
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('hoje no formato da API', () => {
    expect(hojeIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('pesagemPendente', () => {
  const pesagem = (data: string) => ({ data, kg: 80 });

  it('lembrete desligado nunca lembra', () => {
    expect(pesagemPendente([], null, '2026-10-31', null)).toBe(false);
  });

  it('sem nenhuma pesagem, lembra', () => {
    expect(pesagemPendente([], 7, '2026-10-31', null)).toBe(true);
  });

  it('lembra a partir de N dias desde a última pesagem', () => {
    const pesos = [pesagem('2026-10-01'), pesagem('2026-10-24')];
    expect(pesagemPendente(pesos, 7, '2026-10-30', null)).toBe(false); // 6 dias
    expect(pesagemPendente(pesos, 7, '2026-10-31', null)).toBe(true); // 7 dias
  });

  it('"agora não" esconde só no dia em que foi tocado', () => {
    expect(pesagemPendente([], 7, '2026-10-31', '2026-10-31')).toBe(false);
    expect(pesagemPendente([], 7, '2026-11-01', '2026-10-31')).toBe(true);
  });
});
