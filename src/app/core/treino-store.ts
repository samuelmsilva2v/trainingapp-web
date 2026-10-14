import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessoesApi, mensagemDeErro } from './api';
import { DiaHoje, EstadoSessao, ExercicioLocal, ItemPlano, SerieLocal, SessaoLocal, TipoSerie } from './modelos';
import { cargaDoDrop, espelharDrops, repsDoDrop, seriesFeitas, totalSeries } from './series';

export type StatusSincronia = 'salvo' | 'salvando' | 'erro';

const ATRASO_SALVAR_MS = 400;
const ATRASO_REENVIO_MS = 5000;

export function novoId(): string {
  return crypto.randomUUID();
}

/**
 * Mantém a sessão em andamento no cliente e a reenvia inteira para a API a cada mudança
 * (PUT idempotente com ids gerados aqui). Um envio por vez; mudanças feitas durante o envio
 * disparam outro logo em seguida.
 */
@Injectable({ providedIn: 'root' })
export class TreinoStore {
  private readonly api = inject(SessoesApi);

  readonly sessao = signal<SessaoLocal | null>(null);
  readonly status = signal<StatusSincronia>('salvo');
  /** Motivo da última falha de envio; só vale enquanto o status for 'erro'. */
  readonly erro = signal<string | null>(null);

  readonly seriesConcluidas = computed(() =>
    (this.sessao()?.exercicios ?? []).reduce((n, e) => n + seriesFeitas(e), 0),
  );
  readonly totalSeries = computed(() =>
    (this.sessao()?.exercicios ?? []).reduce((n, e) => n + totalSeries(e), 0),
  );

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private temporizadorReenvio: ReturnType<typeof setTimeout> | null = null;
  private reenviou = false;
  private enviando = false;
  private pendente = false;

  /** Retoma uma sessão que a API já tem em andamento (ex.: o app foi recarregado). */
  retomar(sessao: SessaoLocal): void {
    this.sessao.set(sessao);
    this.status.set('salvo');
  }

  /** Cria a sessão a partir do próximo dia da rotação e a grava na API. */
  async iniciar(planoId: string, planoNome: string, dia: DiaHoje): Promise<void> {
    const agora = new Date().toISOString();
    const sessao: SessaoLocal = {
      id: novoId(),
      planoId,
      planoNome,
      diaNome: dia.nome,
      diaOrdem: dia.ordem,
      estado: 'EM_ANDAMENTO',
      iniciadaEm: agora,
      finalizadaEm: null,
      atualizadoEm: agora,
      exercicios: dia.exercicios.map(item => ({
        id: novoId(),
        exercicioId: item.exercicioId,
        nome: item.exercicioNome,
        grupoMuscular: item.grupoMuscular,
        equipamento: item.equipamento,
        imagens: item.imagens,
        metaSeries: item.series,
        metaRepsMin: item.repsMin,
        metaRepsMax: item.repsMax,
        metaCarga: item.cargaAlvo,
        metaDescansoSegundos: item.descansoSegundos,
        metaDrops: item.drops ?? 0,
        series: this.seriesDoPlano(item),
      })),
    };
    await firstValueFrom(this.api.salvar(sessao));
    this.sessao.set(sessao);
    this.status.set('salvo');
  }

  serieNova(reps: number | null, carga: number | null, tipo: TipoSerie = 'NORMAL'): SerieLocal {
    return { id: novoId(), reps, carga, concluida: false, tipo };
  }

  /** As séries da meta, cada uma seguida dos drops planejados, com carga e reps sugeridas em cadeia (80% e 2 a menos que a anterior). */
  private seriesDoPlano(item: ItemPlano): SerieLocal[] {
    const series: SerieLocal[] = [];
    for (let s = 0; s < item.series; s++) {
      series.push(this.serieNova(item.repsMin, item.cargaAlvo));
      let carga = item.cargaAlvo;
      let reps: number | null = item.repsMin;
      for (let d = 0; d < (item.drops ?? 0); d++) {
        carga = cargaDoDrop(carga);
        reps = repsDoDrop(reps);
        series.push(this.serieNova(reps, carga, 'DROP'));
      }
    }
    return series;
  }

  /** Aplica a mudança localmente e agenda o envio. */
  atualizar(mudanca: (sessao: SessaoLocal) => SessaoLocal): void {
    const atual = this.sessao();
    if (!atual) return;
    this.sessao.set({ ...mudanca(atual), atualizadoEm: new Date().toISOString() });
    this.status.set('salvando');
    this.reenviou = false;
    if (this.temporizadorReenvio) clearTimeout(this.temporizadorReenvio);
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.enviar(), ATRASO_SALVAR_MS);
  }

  atualizarExercicio(indice: number, mudanca: (e: ExercicioLocal) => ExercicioLocal): void {
    this.atualizar(s => ({
      ...s,
      exercicios: s.exercicios.map((e, i) => {
        if (i !== indice) return e;
        const novo = mudanca(e);
        return { ...novo, series: espelharDrops(novo.series) };
      }),
    }));
  }

  atualizarSerie(exercicio: number, serie: number, mudanca: (s: SerieLocal) => SerieLocal): void {
    this.atualizarExercicio(exercicio, e => ({
      ...e,
      series: e.series.map((s, i) => (i === serie ? mudanca(s) : s)),
    }));
  }

  /** Tenta de novo o envio que falhou. */
  reenviar(): void {
    void this.enviar();
  }

  /** Garante que o estado atual já está na API, sem esperar o agrupamento de mudanças (ex.: antes de pedir a prévia de XP). */
  async sincronizar(): Promise<void> {
    if (this.temporizador) clearTimeout(this.temporizador);
    if (this.temporizadorReenvio) clearTimeout(this.temporizadorReenvio);
    while (this.enviando) await new Promise(r => setTimeout(r, 50));
    if (this.status() !== 'salvo' && this.sessao()) await this.enviar();
  }

  /** Conclui ou abandona: envia o estado final e, se a API aceitar, larga a sessão local e devolve a resposta (com o XP ganho). */
  async encerrar(estado: Exclude<EstadoSessao, 'EM_ANDAMENTO'>): Promise<SessaoLocal | null> {
    const agora = new Date().toISOString();
    if (this.temporizador) clearTimeout(this.temporizador);
    if (this.temporizadorReenvio) clearTimeout(this.temporizadorReenvio);
    // Espera um envio em curso terminar para não competir com o estado final.
    while (this.enviando) await new Promise(r => setTimeout(r, 50));
    const atual = this.sessao();
    if (!atual) return null;
    const final: SessaoLocal = { ...atual, estado, finalizadaEm: agora, atualizadoEm: agora };
    this.status.set('salvando');
    let resposta: SessaoLocal;
    try {
      resposta = await firstValueFrom(this.api.salvar(final));
    } catch (erro) {
      this.status.set('erro');
      this.erro.set(mensagemDeErro(erro));
      throw erro;
    }
    this.sessao.set(null);
    this.status.set('salvo');
    return resposta;
  }

  /** Uma única nova tentativa automática, para quedas curtas de rede. */
  private reenviarDepois(): void {
    if (this.reenviou) return;
    this.reenviou = true;
    this.temporizadorReenvio = setTimeout(() => {
      if (this.status() === 'erro') void this.enviar();
    }, ATRASO_REENVIO_MS);
  }

  private async enviar(): Promise<void> {
    if (this.enviando) {
      this.pendente = true;
      return;
    }
    const atual = this.sessao();
    if (!atual) return;
    this.enviando = true;
    try {
      await firstValueFrom(this.api.salvar(atual));
      this.status.set(this.pendente ? 'salvando' : 'salvo');
    } catch (erro) {
      this.status.set('erro');
      this.erro.set(mensagemDeErro(erro));
      this.pendente = false;
      this.reenviarDepois();
    } finally {
      this.enviando = false;
    }
    if (this.pendente) {
      this.pendente = false;
      void this.enviar();
    }
  }
}
