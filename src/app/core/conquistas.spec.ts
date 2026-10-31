import { familias, metaComUnidade, visiveis } from './conquistas';
import { Conquista } from './modelos';

const faixa = (familia: string, n: number, meta: number, progresso: number, conquistada = progresso >= meta): Conquista => ({
  codigo: `${familia}_${n}`, nome: `${familia} ${n}`, descricao: `Meta ${meta}.`, conquistada, familia, faixa: n, progresso, meta,
});

describe('familias de conquistas', () => {
  it('agrupa por família na ordem da API e destaca a próxima faixa a conquistar', () => {
    const lista = familias([
      faixa('Constância', 1, 1, 1), faixa('Constância', 2, 10, 10), faixa('Constância', 3, 50, 37),
      faixa('Sequência', 1, 7, 7), faixa('Sequência', 2, 30, 12),
    ]);
    expect(lista.map(f => f.nome)).toEqual(['Constância', 'Sequência']);
    expect(lista[0].destaque.nome).toBe('Constância 3');
    expect(lista[0].progresso).toBe('37/50 treinos');
    expect(lista[0].completa).toBe(false);
    expect(lista[1].progresso).toBe('melhor: 12/30 dias');
  });

  it('família completa destaca a última faixa', () => {
    const [f] = familias([faixa('Recordes variados', 1, 5, 5), faixa('Recordes variados', 2, 10, 10)]);
    expect(f.completa).toBe(true);
    expect(f.destaque.nome).toBe('Recordes variados 2');
    expect(f.progresso).toBe('10/10 exercícios');
  });

  it('faixa única é marcada e as unidades seguem a família', () => {
    const [volta, nivel, semanas, recordes] = familias([
      faixa('De volta', 1, 1, 0), faixa('Nível', 1, 5, 5), faixa('Nível', 2, 10, 7), faixa('Semanas firmes', 1, 4, 3),
      faixa('Recordes', 1, 10, 8),
    ]);
    expect(volta.unica).toBe(true);
    expect(nivel.unica).toBe(false);
    expect(nivel.progresso).toBe('Nível 7/10');
    expect(semanas.progresso).toBe('melhor: 3/4 semanas');
    expect(recordes.progresso).toBe('8/10 recordes');
  });

  it('família sem unidade conhecida mostra só os números', () => {
    expect(familias([faixa('Nova', 1, 3, 1)])[0].progresso).toBe('1/3');
  });

  it('famílias da fatia 2 têm unidade: toneladas, exercícios e blocos', () => {
    const [volume, variedade, drop] = familias([faixa('Volume total', 1, 10, 3), faixa('Variedade', 1, 20, 7), faixa('Drop-set', 1, 1, 0),
      faixa('Drop-set', 2, 25, 0)]);
    expect(volume.progresso).toBe('3/10 t');
    expect(variedade.progresso).toBe('7/20 exercícios');
    expect(drop.progresso).toBe('0/1 blocos');
    expect(metaComUnidade('Volume total', 100)).toBe('100 t');
  });

  it('ocultas só ficam visíveis depois de feitas', () => {
    const coruja = { ...faixa('Coruja', 1, 1, 0), oculta: true };
    const anoNovo = { ...faixa('Ano novo', 1, 1, 1), oculta: true };
    const comum = faixa('De volta', 1, 1, 0);
    expect(visiveis([coruja, anoNovo, comum]).map(c => c.familia)).toEqual(['Ano novo', 'De volta']);
  });

  it('meta da faixa com a unidade, sem o "melhor:"', () => {
    expect(metaComUnidade('Sequência', 7)).toBe('7 dias');
    expect(metaComUnidade('Nível', 5)).toBe('Nível 5');
    expect(metaComUnidade('Constância', 50)).toBe('50 treinos');
  });
});
