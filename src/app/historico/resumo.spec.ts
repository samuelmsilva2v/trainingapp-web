import { SessaoResumo } from '../core/modelos';
import { inicioDaCobertura, limitesDoPeriodo, partesDoTempo, resumirPeriodo, rotuloDoPeriodo } from './resumo';

// Mês de referência: outubro de 2026. 10/out é sábado; a semana é seg 5 a dom 11.
const dia = (d: number, h = 12, mes = 9) => new Date(2026, mes, d, h);

function sessao(inicio: Date, minutos: number, extra: Partial<SessaoResumo> = {}): SessaoResumo {
  return {
    id: String(inicio.getTime()),
    planoNome: 'Plano',
    diaNome: 'A',
    estado: 'CONCLUIDA',
    iniciadaEm: inicio.toISOString(),
    finalizadaEm: new Date(inicio.getTime() + minutos * 60_000).toISOString(),
    exercicios: 4,
    seriesConcluidas: 10,
    volumeKg: 0,
    xpGanho: 100,
    recordes: 0,
    ...extra,
  };
}

describe('limitesDoPeriodo', () => {
  it('a semana vai de segunda a domingo, e o domingo ainda é da semana que acaba nele', () => {
    for (const d of [5, 8, 10, 11]) {
      const { inicio, fim } = limitesDoPeriodo('SEMANA', dia(d));
      expect(inicio).toEqual(dia(5, 0));
      expect(fim).toEqual(dia(12, 0));
    }
    expect(limitesDoPeriodo('SEMANA', dia(12)).inicio).toEqual(dia(12, 0));
  });

  it('o mês é o mês civil e a semana pode atravessar a virada', () => {
    expect(limitesDoPeriodo('MES', dia(10))).toEqual({ inicio: dia(1, 0), fim: new Date(2026, 10, 1) });
    expect(limitesDoPeriodo('SEMANA', dia(1)).inicio).toEqual(new Date(2026, 8, 28)); // 1/out (qui) -> seg 28/set
  });

  it('a cobertura começa na mais antiga entre a semana e o mês', () => {
    expect(inicioDaCobertura(dia(1))).toEqual(new Date(2026, 8, 28));
    expect(inicioDaCobertura(dia(20))).toEqual(dia(1, 0));
  });
});

describe('resumirPeriodo', () => {
  const sessoes = [
    sessao(dia(5, 0), 60), // segunda 00:00: entra (início é inclusivo)
    sessao(dia(7), 45, { seriesConcluidas: 18, xpGanho: 50 }),
    sessao(dia(8), 30, { estado: 'ABANDONADA', xpGanho: 0 }), // abandonado não conta
    sessao(dia(12, 0), 40), // segunda seguinte: fora da semana, dentro do mês
    sessao(new Date(2026, 8, 30, 12), 50), // 30/set: fora do mês
  ];

  it('soma só treinos concluídos da semana', () => {
    expect(resumirPeriodo(sessoes, 'SEMANA', dia(10))).toEqual({ treinos: 2, minutos: 105, series: 28, xp: 150, repsPesoCorporal: 0 });
  });

  it('soma só treinos concluídos do mês', () => {
    expect(resumirPeriodo(sessoes, 'MES', dia(10))).toEqual({ treinos: 3, minutos: 145, series: 38, xp: 250, repsPesoCorporal: 0 });
  });

  it('sem treinos no período, tudo zero', () => {
    expect(resumirPeriodo([], 'SEMANA', dia(10))).toEqual({ treinos: 0, minutos: 0, series: 0, xp: 0, repsPesoCorporal: 0 });
  });
});

describe('rotuloDoPeriodo', () => {
  it('semana dentro do mês, atravessando a virada, e mês', () => {
    expect(rotuloDoPeriodo('SEMANA', dia(10))).toBe('5 a 11 out');
    expect(rotuloDoPeriodo('SEMANA', dia(1))).toBe('28 set a 4 out');
    expect(rotuloDoPeriodo('MES', dia(10))).toBe('outubro de 2026');
  });
});

describe('partesDoTempo', () => {
  it('minutos até uma hora; depois horas e minutos, sem unidade', () => {
    expect(partesDoTempo(0)).toEqual({ valor: '0', unidade: 'min' });
    expect(partesDoTempo(45)).toEqual({ valor: '45', unidade: 'min' });
    expect(partesDoTempo(60)).toEqual({ valor: '1h00', unidade: '' });
    expect(partesDoTempo(130)).toEqual({ valor: '2h10', unidade: '' });
  });
});

describe('resumirPeriodo: peso corporal', () => {
  it('soma as reps de peso corporal só dos treinos concluídos do período', () => {
    const sessoes = [
      sessao(dia(6), 60, { repsPesoCorporal: 40 }),
      sessao(dia(7), 60, { repsPesoCorporal: 25 }),
      sessao(dia(8), 60, { repsPesoCorporal: 99, estado: 'ABANDONADA' }),
      sessao(dia(9), 60),
    ];
    expect(resumirPeriodo(sessoes, 'SEMANA', dia(10)).repsPesoCorporal).toBe(65);
  });
});
