import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SessoesApi } from './api';
import { SessaoLocal } from './modelos';
import { TreinoStore } from './treino-store';

const sessao: SessaoLocal = {
  id: 's1',
  planoId: null,
  planoNome: 'Plano',
  diaNome: 'A',
  diaOrdem: 0,
  estado: 'EM_ANDAMENTO',
  iniciadaEm: '2026-01-01T10:00:00Z',
  finalizadaEm: null,
  atualizadoEm: '2026-01-01T10:00:00Z',
  exercicios: [
    {
      id: 'e1',
      exercicioId: 'x1',
      nome: 'Supino',
      grupoMuscular: 'PEITO',
      equipamento: 'BARRA',
      metaSeries: 1,
      metaRepsMin: 8,
      metaRepsMax: 10,
      metaCarga: null,
      metaDescansoSegundos: null,
      series: [{ id: 'r1', reps: 8, carga: 60, concluida: false }],
    },
  ],
};

describe('TreinoStore', () => {
  let salvar: ReturnType<typeof vi.fn<(s: SessaoLocal) => Observable<SessaoLocal>>>;
  let store: TreinoStore;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    salvar = vi.fn((s: SessaoLocal) => of(s));
    TestBed.configureTestingModule({ providers: [{ provide: SessoesApi, useValue: { salvar } }] });
    store = TestBed.inject(TreinoStore);
    store.retomar(sessao);
  });

  afterEach(() => vi.useRealTimers());

  const marcarReps = (reps: number) => store.atualizarSerie(0, 0, s => ({ ...s, reps }));

  it('iniciar monta os drops do plano depois de cada série, com a carga em cadeia', async () => {
    await store.iniciar('p1', 'Plano', {
      id: 'd1', nome: 'A', ordem: 0,
      exercicios: [{ exercicioId: 'x1', exercicioNome: 'Supino', grupoMuscular: 'PEITO', equipamento: 'BARRA',
        series: 2, repsMin: 8, repsMax: 12, cargaAlvo: 100, descansoSegundos: 90, drops: 2 }],
    });
    const ex = store.sessao()!.exercicios[0];
    expect(ex.metaDrops).toBe(2);
    expect(ex.series.map(x => [x.tipo, x.carga, x.reps])).toEqual([
      ['NORMAL', 100, 8], ['DROP', 80, 6], ['DROP', 65, 4],
      ['NORMAL', 100, 8], ['DROP', 80, 6], ['DROP', 65, 4],
    ]);
    expect(store.totalSeries()).toBe(2);
  });

  it('concluir a série conclui os drops dela (o drop-set é uma série só)', () => {
    store.atualizarExercicio(0, e => ({ ...e, series: [...e.series, { id: 'r2', reps: 6, carga: 45, concluida: false, tipo: 'DROP' }] }));
    store.atualizarSerie(0, 0, x => ({ ...x, concluida: true }));
    expect(store.sessao()!.exercicios[0].series[1].concluida).toBe(true);
    expect(store.seriesConcluidas()).toBe(1);
  });

    it('várias mudanças rápidas geram um envio com o último estado', async () => {
    marcarReps(9);
    marcarReps(10);
    marcarReps(11);
    expect(store.status()).toBe('salvando');

    await vi.advanceTimersByTimeAsync(500);

    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar.mock.calls[0][0].exercicios[0].series[0].reps).toBe(11);
    expect(store.status()).toBe('salvo');
  });

  it('sincronizar envia já o estado atual, sem esperar o agrupamento', async () => {
    marcarReps(9);
    expect(salvar).not.toHaveBeenCalled();

    await store.sincronizar();

    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar.mock.calls[0][0].exercicios[0].series[0].reps).toBe(9);
    expect(store.status()).toBe('salvo');
    await vi.advanceTimersByTimeAsync(1000);
    expect(salvar).toHaveBeenCalledTimes(1); // o envio agendado foi cancelado
  });

  it('encerrar espera o envio em andamento terminar e envia o estado final', async () => {
    const resposta = new Subject<SessaoLocal>();
    salvar.mockReturnValueOnce(resposta);
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500);
    expect(salvar).toHaveBeenCalledTimes(1);

    const encerrando = store.encerrar('CONCLUIDA');
    await vi.advanceTimersByTimeAsync(200);
    expect(salvar).toHaveBeenCalledTimes(1); // ainda esperando o envio em curso

    resposta.next(sessao);
    resposta.complete();
    await vi.advanceTimersByTimeAsync(100);
    await encerrando;

    expect(salvar).toHaveBeenCalledTimes(2);
    expect(salvar.mock.calls[1][0].estado).toBe('CONCLUIDA');
    expect(store.sessao()).toBeNull();
  });

  it('guarda o motivo da falha e tenta de novo uma vez depois de 5 s', async () => {
    const falha = () => throwError(() => new HttpErrorResponse({ status: 422, error: { detail: 'Regra violada' } }));
    salvar.mockImplementationOnce(falha);
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500);

    expect(store.status()).toBe('erro');
    expect(store.erro()).toBe('Regra violada');

    await vi.advanceTimersByTimeAsync(5000);

    expect(salvar).toHaveBeenCalledTimes(2);
    expect(store.status()).toBe('salvo');
  });

  it('não insiste além de uma nova tentativa automática quando a API falha', async () => {
    salvar.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 500 })));
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(30000);

    expect(salvar).toHaveBeenCalledTimes(2);
    expect(store.status()).toBe('erro');
  });

  const semRede = () => throwError(() => new HttpErrorResponse({ status: 0 }));
  const guardado = () => JSON.parse(localStorage.getItem('trainingapp.treino')!) as { sessao: SessaoLocal; enviado: boolean };

  it('sem rede fica offline com a mudança no aparelho e a envia quando a rede volta', async () => {
    salvar.mockImplementationOnce(semRede);
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500);

    expect(store.status()).toBe('offline');
    expect(guardado().enviado).toBe(false);
    expect(guardado().sessao.exercicios[0].series[0].reps).toBe(9);

    dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);

    expect(salvar).toHaveBeenCalledTimes(2);
    expect(store.status()).toBe('salvo');
    expect(guardado().enviado).toBe(true);
  });

  it('só marca "salvo" se o que foi enviado ainda é o estado atual', async () => {
    const resposta = new Subject<SessaoLocal>();
    salvar.mockReturnValueOnce(resposta);
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500); // envio em curso
    marcarReps(10); // mudança durante o envio, antes do agrupamento disparar

    resposta.next(sessao);
    resposta.complete();
    await vi.advanceTimersByTimeAsync(10);
    expect(store.status()).toBe('salvando');

    await store.sincronizar(); // a prévia de XP não pode pular a mudança pendente
    expect(salvar.mock.calls.at(-1)![0].exercicios[0].series[0].reps).toBe(10);
    expect(store.status()).toBe('salvo');
  });

  it('409: fica a versão da API e avisa', async () => {
    const doServidor = { ...sessao, atualizadoEm: '2026-01-01T11:00:00Z' };
    salvar.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 409, error: doServidor })));
    marcarReps(9);
    await vi.advanceTimersByTimeAsync(500);

    expect(store.sessao()).toEqual(doServidor);
    expect(store.status()).toBe('salvo');
    expect(store.avisoConflito()).toContain('outro aparelho');
  });

  it('encerrar sem rede guarda o treino no aparelho e o envia quando a rede volta', async () => {
    salvar.mockImplementationOnce(semRede);
    expect(await store.encerrar('CONCLUIDA')).toBe('offline');
    expect(store.sessao()).toBeNull();
    expect(guardado().sessao.estado).toBe('CONCLUIDA');

    dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);

    expect(salvar.mock.calls.at(-1)![0].estado).toBe('CONCLUIDA');
    expect(localStorage.getItem('trainingapp.treino')).toBeNull();
  });

  it('ao reabrir o app, retoma do aparelho as mudanças que não chegaram à API e as envia', async () => {
    salvar.mockImplementationOnce(semRede);
    marcarReps(11);
    await vi.advanceTimersByTimeAsync(500);

    // App reaberto: um store novo lê o aparelho.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: SessoesApi, useValue: { salvar } }] });
    const reaberto = TestBed.inject(TreinoStore);
    await vi.advanceTimersByTimeAsync(10);

    expect(reaberto.sessao()!.exercicios[0].series[0].reps).toBe(11);
    expect(salvar.mock.calls.at(-1)![0].exercicios[0].series[0].reps).toBe(11);
    expect(reaberto.status()).toBe('salvo');
  });

  it('a versão mais antiga da API não desfaz mudanças do aparelho que ainda não chegaram a ela', async () => {
    salvar.mockImplementation(semRede);
    marcarReps(11);
    await vi.advanceTimersByTimeAsync(500);

    store.retomar(sessao); // a API ainda tem a versão de antes
    expect(store.sessao()!.exercicios[0].series[0].reps).toBe(11);
    expect(guardado().enviado).toBe(false);
  });
});
