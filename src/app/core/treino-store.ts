import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Network } from '@capacitor/network';
import { firstValueFrom } from 'rxjs';
import { SessoesApi, mensagemDeErro } from './api';
import { DiaHoje, EstadoSessao, ExercicioLocal, ItemPlano, SerieLocal, SessaoLocal, TipoSerie } from './modelos';
import { cargaDoDrop, espelharDrops, repsDoDrop, seriesFeitas, totalSeries } from './series';

export type StatusSincronia = 'salvo' | 'salvando' | 'offline' | 'erro';

const ATRASO_SALVAR_MS = 400;
const ATRASO_REENVIO_MS = 5000;
const CHAVE_LOCAL = 'trainingapp.treino';

export function novoId(): string {
  return crypto.randomUUID();
}

/** Cópia do treino no aparelho: o em andamento, ou um encerrado sem rede que ainda não chegou à API. */
interface TreinoLocal {
  sessao: SessaoLocal;
  enviado: boolean;
}

function lerLocal(): TreinoLocal | null {
  try {
    const texto = localStorage.getItem(CHAVE_LOCAL);
    return texto ? (JSON.parse(texto) as TreinoLocal) : null;
  } catch {
    return null;
  }
}

function gravarLocal(local: TreinoLocal): void {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(local));
  } catch {
    // Sem armazenamento (navegação privada, cota cheia): o treino segue só na memória, como antes.
  }
}

/** Ao sair da conta: o treino guardado no aparelho é de quem saiu. */
export function apagarTreinoLocal(): void {
  try {
    localStorage.removeItem(CHAVE_LOCAL);
  } catch {
    // nada guardado
  }
}

const semRede = (erro: unknown) => erro instanceof HttpErrorResponse && erro.status === 0;
const conflito = (erro: unknown): erro is HttpErrorResponse => erro instanceof HttpErrorResponse && erro.status === 409;
const recusado = (erro: unknown) => erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 422);

/**
 * Mantém a sessão em andamento no cliente e a reenvia inteira para a API a cada mudança (PUT idempotente com ids
 * gerados aqui). Um envio por vez; mudanças feitas durante o envio disparam outro logo em seguida. Cada mudança também
 * fica no aparelho: fechar o app ou ficar sem rede não perde nada, e o último estado vai para a API quando a rede voltar
 * (a fila é só esse estado, já que o PUT leva a sessão inteira).
 */
@Injectable({ providedIn: 'root' })
export class TreinoStore {
  private readonly api = inject(SessoesApi);

  readonly sessao = signal<SessaoLocal | null>(null);
  readonly status = signal<StatusSincronia>('salvo');
  /** Motivo da última falha de envio; só vale enquanto o status for 'erro'. */
  readonly erro = signal<string | null>(null);
  /** Outro aparelho escreveu depois (409): ficou a versão da API. A tela mostra o aviso e o limpa. */
  readonly avisoConflito = signal<string | null>(null);

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
  /** Treino encerrado sem rede, à espera de ser enviado. */
  private encerradoPendente: SessaoLocal | null = null;

  constructor() {
    const local = lerLocal();
    if (local && !local.enviado) {
      if (local.sessao.estado === 'EM_ANDAMENTO') {
        this.sessao.set(local.sessao);
        this.status.set('salvando');
      } else {
        this.encerradoPendente = local.sessao;
      }
      void this.enviarPendente();
    }
    // O evento 'online' do navegador não dispara no WebView do Android; o plugin ouve a conectividade do aparelho.
    void Network.addListener('networkStatusChange', ({ connected }) => {
      if (connected) void this.enviarPendente();
    });
  }

  /**
   * Retoma uma sessão que a API tem em andamento (ex.: o app foi reaberto). Se o aparelho tem uma versão mais nova
   * dela que não chegou à API (mudanças feitas sem rede), fica a do aparelho e ela é enviada.
   */
  retomar(sessao: SessaoLocal): void {
    const local = lerLocal();
    if (local && !local.enviado && local.sessao.id === sessao.id && local.sessao.atualizadoEm > sessao.atualizadoEm) {
      this.sessao.set(local.sessao);
      this.status.set('salvando');
      void this.enviar();
      return;
    }
    this.sessao.set(sessao);
    this.status.set('salvo');
    gravarLocal({ sessao, enviado: true });
  }

  /**
   * Sem rede para perguntar à API: abre o treino em andamento guardado no aparelho, se houver. Devolve se abriu.
   * (Com rede, a API manda: o treino pode ter sido encerrado em outro aparelho.)
   */
  abrirDoAparelho(): boolean {
    if (this.sessao()) return true;
    const local = lerLocal();
    if (!local || local.sessao.estado !== 'EM_ANDAMENTO') return false;
    this.sessao.set(local.sessao);
    this.status.set(local.enviado ? 'salvo' : 'offline');
    return true;
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
    gravarLocal({ sessao, enviado: true });
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

  /** Aplica a mudança localmente (e no aparelho) e agenda o envio. */
  atualizar(mudanca: (sessao: SessaoLocal) => SessaoLocal): void {
    const atual = this.sessao();
    if (!atual) return;
    const nova = { ...mudanca(atual), atualizadoEm: new Date().toISOString() };
    this.sessao.set(nova);
    gravarLocal({ sessao: nova, enviado: false });
    if (this.status() !== 'offline') this.status.set('salvando');
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

  /**
   * Conclui ou abandona: envia o estado final e, se a API aceitar, larga a sessão local e devolve a resposta (com o XP
   * ganho). Sem rede, guarda o treino encerrado no aparelho, larga a sessão e devolve 'offline': ele vai para a API
   * quando a rede voltar. Se outro aparelho escreveu depois (409), fica a versão da API e o encerramento falha.
   */
  async encerrar(estado: Exclude<EstadoSessao, 'EM_ANDAMENTO'>): Promise<SessaoLocal | 'offline' | null> {
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
      if (semRede(erro)) {
        this.encerradoPendente = final;
        gravarLocal({ sessao: final, enviado: false });
        this.sessao.set(null);
        this.status.set('offline');
        return 'offline';
      }
      if (conflito(erro)) {
        this.adotarDoServidor(erro);
        throw new Error('O treino mudou em outro aparelho e ficou a versão mais recente. Confira e encerre de novo.');
      }
      this.status.set('erro');
      this.erro.set(mensagemDeErro(erro));
      throw erro;
    }
    apagarTreinoLocal();
    this.sessao.set(null);
    this.status.set('salvo');
    return resposta;
  }

  /** Envia o que ficou no aparelho sem chegar à API: o treino encerrado sem rede, ou as últimas mudanças do em andamento. */
  private async enviarPendente(): Promise<void> {
    const encerrado = this.encerradoPendente;
    if (!encerrado) {
      if (this.sessao() && this.status() !== 'salvo') await this.enviar();
      return;
    }
    try {
      await firstValueFrom(this.api.salvar(encerrado));
    } catch (erro) {
      // Só a recusa da API (outro aparelho mexeu depois, regra violada) descarta; sem rede ou API fora do ar (502 num
      // deploy), o treino fica no aparelho e vai na próxima vez que a rede voltar ou o app abrir.
      if (!recusado(erro)) return;
      console.warn('Treino encerrado sem rede foi recusado pela API', erro);
    }
    this.encerradoPendente = null;
    apagarTreinoLocal();
    this.status.set('salvo');
  }

  private adotarDoServidor(erro: HttpErrorResponse): void {
    const servidor = erro.error as SessaoLocal;
    this.sessao.set(servidor);
    gravarLocal({ sessao: servidor, enviado: true });
    this.status.set('salvo');
    this.avisoConflito.set('O treino mudou em outro aparelho: ficou a versão mais recente.');
  }

  /** Uma única nova tentativa automática, para falhas passageiras da API (sem rede, espera a rede voltar). */
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
      // Só "salvo" se o que foi enviado ainda é o estado atual; senão há uma mudança esperando o próximo envio.
      if (this.sessao() === atual) {
        this.status.set('salvo');
        gravarLocal({ sessao: atual, enviado: true });
      } else {
        this.status.set('salvando');
      }
    } catch (erro) {
      this.pendente = false;
      if (semRede(erro)) {
        this.status.set('offline');
      } else if (conflito(erro)) {
        this.adotarDoServidor(erro);
      } else {
        this.status.set('erro');
        this.erro.set(mensagemDeErro(erro));
        this.reenviarDepois();
      }
    } finally {
      this.enviando = false;
    }
    if (this.pendente) {
      this.pendente = false;
      void this.enviar();
    }
  }
}
