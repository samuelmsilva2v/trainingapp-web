import { coeficienteDeCarga, comparacaoComUltimo, melhorSerie, volumeTotal } from './coeficiente';
import { ExercicioLocal, SerieLocal, SessaoLocal, SessaoResumo } from './modelos';

const serie = (reps: number, carga: number, concluida = true): SerieLocal => ({ id: `${reps}-${carga}`, reps, carga, concluida });

const exercicio = (metaCarga: number | null, series: SerieLocal[]): ExercicioLocal => ({
  id: 'e', exercicioId: 'x', nome: 'Supino', grupoMuscular: 'PEITO', equipamento: 'BARRA',
  metaSeries: 3, metaRepsMin: 8, metaRepsMax: 12, metaCarga, metaDescansoSegundos: null, series,
});

const sessao = (exercicios: ExercicioLocal[]): SessaoLocal => ({
  id: 's', planoId: null, planoNome: 'ABC', diaNome: 'Push', diaOrdem: 0, estado: 'CONCLUIDA',
  iniciadaEm: '', finalizadaEm: '', atualizadoEm: '', exercicios,
});

describe('coeficiente de carga', () => {
  it('é 1,00 quando o planejado (séries × carga × reps mín) foi cumprido', () => {
    const s = sessao([exercicio(60, [serie(8, 60), serie(8, 60), serie(8, 60)])]);
    expect(coeficienteDeCarga(s)).toBe(1);
  });

  it('cai quando há séries não feitas e sobe quando se carrega mais', () => {
    expect(coeficienteDeCarga(sessao([exercicio(60, [serie(8, 60), serie(8, 60), serie(8, 60, false)])]))).toBeCloseTo(2 / 3);
    expect(coeficienteDeCarga(sessao([exercicio(60, [serie(8, 66), serie(8, 66), serie(8, 66)])]))).toBeCloseTo(1.1);
  });

  it('ignora exercícios sem carga alvo e é nulo se nenhum tem', () => {
    const s = sessao([exercicio(60, [serie(8, 60), serie(8, 60), serie(8, 60)]), exercicio(null, [serie(10, 20)])]);
    expect(coeficienteDeCarga(s)).toBe(1);
    expect(coeficienteDeCarga(sessao([exercicio(null, [serie(10, 20)])]))).toBeNull();
  });
});

describe('comparação e melhor série', () => {
  const resumo = (over: Partial<SessaoResumo>): SessaoResumo =>
    ({ id: 'a', planoNome: 'ABC', diaNome: 'Push', estado: 'CONCLUIDA', volumeKg: 1000, ...over }) as SessaoResumo;

  it('compara com o último concluído do mesmo dia da rotação, ignorando a própria sessão e abandonados', () => {
    const s = sessao([exercicio(60, [serie(10, 60), serie(10, 60)])]); // 1200 kg
    expect(volumeTotal(s)).toBe(1200);
    const historico = [
      resumo({ id: 's' }),
      resumo({ id: 'b', estado: 'ABANDONADA' }),
      resumo({ id: 'c', diaNome: 'Pull' }),
      resumo({ id: 'd', volumeKg: 800 }),
    ];
    expect(comparacaoComUltimo(s, historico)).toBe(1.5);
    expect(comparacaoComUltimo(s, [])).toBeNull();
  });

  it('a melhor série é a de maior carga, com desempate por reps', () => {
    const e = exercicio(60, [serie(10, 60), serie(6, 70), serie(8, 70), serie(12, 80, false)]);
    expect(melhorSerie(e)).toEqual(serie(8, 70));
  });
});
