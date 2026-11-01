import { ExercicioLocal, ItemPlano, Plano, SerieLocal, SessaoLocal, TipoSerie } from './modelos';
import { mudancasDoPlano } from './plano-da-sessao';

let n = 0;
const serie = (tipo: TipoSerie = 'NORMAL'): SerieLocal => ({ id: `s${n++}`, reps: 8, carga: 50, concluida: true, tipo });
const normais = (k: number) => Array.from({ length: k }, () => serie());
/** k séries, cada uma com `drops` etapas DROP depois. */
const comDrops = (...porSerie: number[]) => porSerie.flatMap(d => [serie(), ...Array.from({ length: d }, () => serie('DROP'))]);

const item = (exercicioId: string, nome: string, extra: Partial<ItemPlano> = {}): ItemPlano => ({
  exercicioId, exercicioNome: nome, grupoMuscular: 'PEITO', equipamento: 'BARRA',
  series: 3, repsMin: 8, repsMax: 12, cargaAlvo: 60, descansoSegundos: 90, drops: 0, ...extra,
});

/** A sessão como começou a partir do item (o snapshot das metas), com as séries dadas. */
const linha = (it: ItemPlano, series: SerieLocal[], extra: Partial<ExercicioLocal> = {}): ExercicioLocal => ({
  id: `l${n++}`, exercicioId: it.exercicioId, nome: it.exercicioNome, grupoMuscular: it.grupoMuscular, equipamento: it.equipamento,
  metaSeries: it.series, metaRepsMin: it.repsMin, metaRepsMax: it.repsMax, metaCarga: it.cargaAlvo,
  metaDescansoSegundos: it.descansoSegundos, metaDrops: it.drops, series, ...extra,
});

const supino = item('supino-reto', 'Supino reto');
const crucifixo = item('crucifixo', 'Crucifixo', { drops: 2, repsMin: 10, repsMax: 10 });
const plano: Plano = {
  id: 'p1', nome: 'ABC', objetivo: 'HIPERTROFIA', ativo: true,
  dias: [
    { nome: 'Treino A', exercicios: [item('agachamento', 'Agachamento')] },
    { nome: 'Treino B', exercicios: [supino, crucifixo] },
  ],
};

const sessao = (exercicios: ExercicioLocal[], extra: Partial<SessaoLocal> = {}): SessaoLocal => ({
  id: 'x', planoId: 'p1', planoNome: 'ABC', diaNome: 'Treino B', diaOrdem: 1, estado: 'CONCLUIDA',
  iniciadaEm: '', finalizadaEm: '', atualizadoEm: '', exercicios, ...extra,
});
const igual = () => [linha(supino, normais(3)), linha(crucifixo, comDrops(2, 2, 2))];

describe('mudancasDoPlano', () => {
  it('sem mudança na estrutura, não oferece nada (carga e reps feitas não contam)', () => {
    const s = sessao(igual());
    s.exercicios[0].series[0] = { ...s.exercicios[0].series[0], carga: 80, reps: 3 };
    expect(mudancasDoPlano(s, plano)).toBeNull();
  });

  it('treino abandonado ou de outro plano não oferece', () => {
    const [, cruc] = igual();
    const mudou = [linha(supino, normais(4)), cruc];
    expect(mudancasDoPlano(sessao(mudou, { estado: 'ABANDONADA' }), plano)).toBeNull();
    expect(mudancasDoPlano(sessao(mudou, { planoId: 'outro' }), plano)).toBeNull();
  });

  it('troca de exercício: entra o novo, sem carga alvo, com reps, séries e descanso do plano', () => {
    const r = mudancasDoPlano(sessao([
      linha(supino, normais(3), { exercicioId: 'supino-inclinado', nome: 'Supino inclinado', metaCarga: null }),
      linha(crucifixo, comDrops(2, 2, 2)),
    ]), plano)!;
    expect(r.mudancas).toEqual([{ icone: 'sync_alt', texto: 'Supino reto → Supino inclinado' }]);
    expect(r.plano.dias[1].exercicios[0]).toEqual({
      exercicioId: 'supino-inclinado', series: 3, repsMin: 8, repsMax: 12, cargaAlvo: null, descansoSegundos: 90, drops: 0,
    });
    // O resto do plano vai igual.
    expect(r.plano.dias[0].exercicios[0].exercicioId).toBe('agachamento');
    expect(r.plano.dias[1].exercicios[1]).toMatchObject({ exercicioId: 'crucifixo', cargaAlvo: 60, drops: 2 });
    expect([r.plano.nome, r.plano.objetivo, r.plano.dias.map(d => d.nome)]).toEqual(['ABC', 'HIPERTROFIA', ['Treino A', 'Treino B']]);
  });

  it('séries a mais e a menos (feitas ou não) mudam o número de séries do plano', () => {
    const mais = mudancasDoPlano(sessao([linha(supino, [...normais(3), { ...serie(), concluida: false }]), linha(crucifixo, comDrops(2, 2, 2))]), plano)!;
    expect(mais.mudancas).toEqual([{ icone: 'add', texto: 'Supino reto: 3 → 4 séries' }]);
    expect(mais.plano.dias[1].exercicios[0].series).toBe(4);

    const menos = mudancasDoPlano(sessao([linha(supino, normais(3)), linha(crucifixo, comDrops(2, 2))]), plano)!;
    expect(menos.mudancas).toEqual([{ icone: 'remove', texto: 'Crucifixo: 3 → 2 séries' }]);
    expect(menos.plano.dias[1].exercicios[1]).toMatchObject({ series: 2, drops: 2 });
  });

  it('drop-set ligado pela troca entra no plano, com reps únicas', () => {
    const r = mudancasDoPlano(sessao([
      linha(supino, comDrops(2, 2, 2), { exercicioId: 'supino-maquina', nome: 'Supino máquina', metaDrops: 2, metaRepsMin: 8, metaRepsMax: 8 }),
      linha(crucifixo, comDrops(2, 2, 2)),
    ]), plano)!;
    expect(r.mudancas.map(m => m.texto)).toEqual(['Supino reto → Supino máquina', 'Supino máquina: drop-set ligado (3 etapas)']);
    expect(r.plano.dias[1].exercicios[0]).toMatchObject({ exercicioId: 'supino-maquina', drops: 2, repsMin: 8, repsMax: 8 });
  });

  it('drop-set desligado pela troca volta a séries normais', () => {
    const r = mudancasDoPlano(sessao([
      linha(supino, normais(3)),
      linha(crucifixo, normais(3), { exercicioId: 'voador', nome: 'Voador', metaDrops: 0 }),
    ]), plano)!;
    expect(r.mudancas.map(m => m.texto)).toEqual(['Crucifixo → Voador', 'Voador: drop-set desligado']);
    expect(r.plano.dias[1].exercicios[1]).toMatchObject({ exercicioId: 'voador', drops: 0 });
  });

  it('etapas do drop-set: só muda se todas as séries ficaram iguais', () => {
    const todas = mudancasDoPlano(sessao([linha(supino, normais(3)), linha(crucifixo, comDrops(1, 1, 1))]), plano)!;
    expect(todas.mudancas).toEqual([{ icone: 'trending_down', texto: 'Crucifixo: drop-set de 3 → 2 etapas' }]);
    expect(todas.plano.dias[1].exercicios[1].drops).toBe(1);

    expect(mudancasDoPlano(sessao([linha(supino, normais(3)), linha(crucifixo, comDrops(2, 1, 2))]), plano)).toBeNull();
  });

  it('plano editado ou removido desde o início do treino: não oferece', () => {
    const mudou = sessao([linha(supino, normais(4)), linha(crucifixo, comDrops(2, 2, 2))]);
    const comItem = (i: number, extra: Partial<ItemPlano>): Plano => ({
      ...plano, dias: [plano.dias[0], { ...plano.dias[1], exercicios: plano.dias[1].exercicios.map((it, k) => (k === i ? { ...it, ...extra } : it)) }],
    });
    expect(mudancasDoPlano(mudou, comItem(0, { series: 5 }))).toBeNull();
    expect(mudancasDoPlano(mudou, comItem(0, { descansoSegundos: 60 }))).toBeNull();
    expect(mudancasDoPlano(mudou, comItem(1, { repsMin: 6, repsMax: 6 }))).toBeNull();
    expect(mudancasDoPlano(mudou, { ...plano, dias: [plano.dias[0]] })).toBeNull();
    expect(mudancasDoPlano(mudou, { ...plano, dias: [plano.dias[0], { ...plano.dias[1], exercicios: [supino] }] })).toBeNull();
  });
});
