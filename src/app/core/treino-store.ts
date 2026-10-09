import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessoesApi } from './api';
import { DiaHoje, EstadoSessao, ExercicioLocal, SerieLocal, SessaoLocal } from './modelos';

export type StatusSincronia = 'salvo' | 'salvando' | 'erro';

const ATRASO_SALVAR_MS = 400;

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

  readonly seriesConcluidas = computed(() =>
    (this.sessao()?.exercicios ?? []).reduce((n, e) => n + e.series.filter(s => s.concluida).length, 0),
  );
  readonly totalSeries = computed(() =>
    (this.sessao()?.exercicios ?? []).reduce((n, e) => n + e.series.length, 0),
  );
  readonly volumeKg = computed(() =>
    (this.sessao()?.exercicios ?? []).reduce(
      (total, e) =>
        total + e.series.filter(s => s.concluida).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0),
      0,
    ),
  );

  private temporizador: ReturnType<typeof setTimeout> | null = null;
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
        metaSeries: item.series,
        metaRepsMin: item.repsMin,
        metaRepsMax: item.repsMax,
        metaCarga: item.cargaAlvo,
        metaDescansoSegundos: item.descansoSegundos,
        series: Array.from({ length: item.series }, () => this.serieNova(item.repsMin, item.cargaAlvo)),
      })),
    };
    await firstValueFrom(this.api.salvar(sessao));
    this.sessao.set(sessao);
    this.status.set('salvo');
  }

  serieNova(reps: number | null, carga: number | null): SerieLocal {
    return { id: novoId(), reps, carga, concluida: false };
  }

  /** Aplica a mudança localmente e agenda o envio. */
  atualizar(mudanca: (sessao: SessaoLocal) => SessaoLocal): void {
    const atual = this.sessao();
    if (!atual) return;
    this.sessao.set({ ...mudanca(atual), atualizadoEm: new Date().toISOString() });
    this.status.set('salvando');
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.enviar(), ATRASO_SALVAR_MS);
  }

  atualizarExercicio(indice: number, mudanca: (e: ExercicioLocal) => ExercicioLocal): void {
    this.atualizar(s => ({
      ...s,
      exercicios: s.exercicios.map((e, i) => (i === indice ? mudanca(e) : e)),
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

  /** Conclui ou abandona: envia o estado final e, se a API aceitar, larga a sessão local. */
  async encerrar(estado: Exclude<EstadoSessao, 'EM_ANDAMENTO'>): Promise<void> {
    const agora = new Date().toISOString();
    if (this.temporizador) clearTimeout(this.temporizador);
    // Espera um envio em curso terminar para não competir com o estado final.
    while (this.enviando) await new Promise(r => setTimeout(r, 50));
    const atual = this.sessao();
    if (!atual) return;
    const final: SessaoLocal = { ...atual, estado, finalizadaEm: agora, atualizadoEm: agora };
    this.status.set('salvando');
    try {
      await firstValueFrom(this.api.salvar(final));
    } catch (erro) {
      this.status.set('erro');
      throw erro;
    }
    this.sessao.set(null);
    this.status.set('salvo');
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
    } catch {
      this.status.set('erro');
      this.pendente = false;
    } finally {
      this.enviando = false;
    }
    if (this.pendente) {
      this.pendente = false;
      void this.enviar();
    }
  }
}
