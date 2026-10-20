import { diasEntre, hojeIso, tendencia } from './peso';

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
