import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GamificacaoApi, SessoesApi, mensagemDeErro } from '../core/api';
import { cronometro, formatarCarga, formatarKg } from '../core/formatos';
import { Anterior, ExercicioLocal, Gamificacao, SerieLocal, SessaoLocal } from '../core/modelos';
import { rotuloEquipamento, rotuloGrupo } from '../core/rotulos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { ConfirmarDialogo } from '../compartilhado/confirmar-dialogo';
import { seriesFeitas } from '../core/series';
import { xpDoExercicio, xpEstimado } from '../core/xp';
import { ResultadoTreino } from './resultado-treino';

const PASSO_CARGA = 1;
const CARGA_MAX = 9999;
const REPS_MAX = 1000;

@Component({
  selector: 'app-treino',
  templateUrl: './treino.html',
  styleUrl: './treino.scss',
})
export class Treino implements OnInit, OnDestroy {
  protected readonly store = inject(TreinoStore);
  private readonly api = inject(SessoesApi);
  private readonly gamificacao = inject(GamificacaoStore);
  private readonly gamificacaoApi = inject(GamificacaoApi);
  private readonly roteador = inject(Router);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly rotuloGrupo = rotuloGrupo;
  protected readonly rotuloEquipamento = rotuloEquipamento;
  protected readonly formatarCarga = formatarCarga;
  /** Kg sem casas decimais quando a carga é inteira (30), com vírgula só se vier quebrada (32,5). */
  protected readonly kg = (v: number): string => (Number.isInteger(v) ? String(v) : formatarCarga(v));
  protected readonly formatarKg = formatarKg;
  protected readonly cronometro = cronometro;
  protected readonly seriesFeitas = seriesFeitas;
  /** XP previsto do exercício; é zero quando o treino todo ainda não rende XP (menos de 3 séries). */
  protected xpPrevistoDoExercicio(e: ExercicioLocal): number {
    return this.xpPrevisto() > 0 ? xpDoExercicio(e) : 0;
  }
  protected readonly xpPrevisto = computed(() => {
    const s = this.store.sessao();
    return s ? xpEstimado(s) : 0;
  });

  protected readonly carregando = signal(true);
  protected readonly indice = signal(0);
  /** Série aberta para edição; null = a primeira ainda não feita. */
  private readonly serieAberta = signal<number | null>(null);
  private readonly anteriores = signal<ReadonlyMap<string, Anterior>>(new Map());
  protected readonly indiceAtivo = computed(() => {
    const series = this.exercicio()?.series ?? [];
    const aberta = this.serieAberta();
    if (aberta !== null && aberta < series.length) return aberta;
    const pendente = series.findIndex(s => !s.concluida);
    return pendente === -1 ? series.length - 1 : pendente;
  });
  protected readonly resumoAberto = signal(false);
  protected readonly encerrando = signal(false);

  // Relógio da tela: tempo de treino e contagem do descanso.
  private readonly agora = signal(Date.now());
  private readonly fimDescanso = signal<number | null>(null);
  private readonly totalDescanso = signal(0);
  private intervalo: ReturnType<typeof setInterval> | null = null;

  protected readonly sessao = this.store.sessao;
  protected readonly exercicio = computed(() => this.sessao()?.exercicios[this.indice()] ?? null);
  protected readonly proximo = computed(() => this.sessao()?.exercicios[this.indice() + 1] ?? null);
  protected readonly decorrido = computed(() => {
    const s = this.sessao();
    return s ? (this.agora() - new Date(s.iniciadaEm).getTime()) / 1000 : 0;
  });
  protected readonly descansoRestante = computed(() => {
    const fim = this.fimDescanso();
    return fim === null ? null : Math.max(0, Math.ceil((fim - this.agora()) / 1000));
  });
  protected readonly descansoProgresso = computed(() => {
    const restante = this.descansoRestante();
    const total = this.totalDescanso();
    return restante === null || total === 0 ? 0 : Math.min(100, (restante / total) * 100);
  });

  ngOnInit(): void {
    this.intervalo = setInterval(() => this.tique(), 1000);
    if (this.store.sessao()) {
      this.carregando.set(false);
      this.carregarAnteriores();
      return;
    }
    // Recarregou a página no meio do treino: a API guarda a sessão em andamento.
    this.api.hoje().subscribe({
      next: hoje => {
        if (hoje.sessaoEmAndamento) {
          this.store.retomar(hoje.sessaoEmAndamento);
          this.carregando.set(false);
          this.carregarAnteriores();
        } else {
          this.roteador.navigate(['/hoje']);
        }
      },
      error: e => {
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
        this.roteador.navigate(['/hoje']);
      },
    });
  }

  /** Busca, de uma vez, as séries do último treino de cada exercício (coluna "Anterior"). */
  private carregarAnteriores(): void {
    const ids = [...new Set((this.store.sessao()?.exercicios ?? []).map(e => e.exercicioId))];
    if (ids.length === 0) return;
    this.api.anteriores(ids).subscribe({
      next: lista => this.anteriores.set(new Map(lista.map(a => [a.exercicioId, a]))),
      error: () => this.anteriores.set(new Map()), // sem histórico a coluna fica com —
    });
  }

  /** reps × carga da mesma série no último treino, ou null. */
  protected textoAnterior(ex: ExercicioLocal, indice: number): string | null {
    const s = this.anteriores().get(ex.exercicioId)?.series[indice];
    if (!s || s.reps === null) return null;
    return s.carga === null ? `${s.reps}` : `${s.reps} × ${this.kg(s.carga)}`;
  }

  /** Ex.: "4 × 10 @ 62,5 kg" (nº de séries × reps da melhor série @ carga). */
  protected resumoAnterior(ex: ExercicioLocal): string | null {
    const series = this.anteriores().get(ex.exercicioId)?.series ?? [];
    const comCarga = series.filter(s => s.reps !== null && s.carga !== null);
    if (comCarga.length === 0) return null;
    const melhor = comCarga.reduce((m, s) => ((s.carga ?? 0) > (m.carga ?? 0) ? s : m));
    return `${series.length} × ${melhor.reps} @ ${this.kg(melhor.carga ?? 0)} kg`;
  }

  protected ativarSerie(indice: number): void {
    this.serieAberta.set(indice);
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  private tique(): void {
    const agora = Date.now();
    this.agora.set(agora);
    const fim = this.fimDescanso();
    if (fim !== null && agora >= fim) {
      this.fimDescanso.set(null);
      navigator.vibrate?.(200);
    }
  }

  // --- navegação entre exercícios ---

  protected irPara(delta: -1 | 1): void {
    const total = this.sessao()?.exercicios.length ?? 0;
    this.indice.update(i => Math.min(total - 1, Math.max(0, i + delta)));
    this.serieAberta.set(null);
  }

  // --- séries ---

  protected ajustarReps(serie: number, delta: 1 | -1): void {
    this.store.atualizarSerie(this.indice(), serie, s => {
      const reps = Math.min(REPS_MAX, Math.max(0, (s.reps ?? 0) + delta));
      return { ...s, reps, concluida: s.concluida && reps >= 1 };
    });
  }

  protected ajustarCarga(serie: number, delta: 1 | -1): void {
    this.store.atualizarSerie(this.indice(), serie, s => ({
      ...s,
      carga: this.limparCarga((s.carga ?? 0) + delta * PASSO_CARGA),
    }));
  }

  protected digitarReps(serie: number, evento: Event): void {
    const valor = parseInt((evento.target as HTMLInputElement).value, 10);
    const reps = Number.isNaN(valor) ? null : Math.min(REPS_MAX, Math.max(0, valor));
    this.store.atualizarSerie(this.indice(), serie, s => ({
      ...s,
      reps,
      concluida: s.concluida && (reps ?? 0) >= 1,
    }));
  }

  protected digitarCarga(serie: number, evento: Event): void {
    const valor = parseFloat((evento.target as HTMLInputElement).value.replace(',', '.'));
    this.store.atualizarSerie(this.indice(), serie, s => ({
      ...s,
      carga: Number.isNaN(valor) ? null : this.limparCarga(valor),
    }));
  }

  private limparCarga(valor: number): number {
    return Math.round(Math.min(CARGA_MAX, Math.max(0, valor))); // carga em kg inteiros
  }

  protected alternarConcluida(serie: number): void {
    const ex = this.exercicio();
    const atual = ex?.series[serie];
    if (!ex || !atual) return;
    if (!atual.concluida && (atual.reps ?? 0) < 1) {
      this.aviso.open('Informe pelo menos 1 repetição para concluir a série.', undefined, { duration: 3000 });
      return;
    }
    this.store.atualizarSerie(this.indice(), serie, s => ({ ...s, concluida: !s.concluida }));
    this.serieAberta.set(null); // a próxima série pendente passa a ser a atual
    if (!atual.concluida && ex.metaDescansoSegundos) {
      this.iniciarDescanso(ex.metaDescansoSegundos);
    }
  }

  protected adicionarSerie(): void {
    this.store.atualizarExercicio(this.indice(), e => {
      const ultima: SerieLocal | undefined = e.series[e.series.length - 1];
      const nova = this.store.serieNova(ultima?.reps ?? e.metaRepsMin, ultima?.carga ?? e.metaCarga);
      return { ...e, series: [...e.series, nova] };
    });
    this.serieAberta.set((this.exercicio()?.series.length ?? 1) - 1);
  }

  protected removerSerie(serie: number): void {
    this.store.atualizarExercicio(this.indice(), e => ({ ...e, series: e.series.filter((_, i) => i !== serie) }));
    this.serieAberta.set(null);
  }

  // --- descanso ---

  private iniciarDescanso(segundos: number): void {
    this.totalDescanso.set(segundos);
    this.fimDescanso.set(Date.now() + segundos * 1000);
    this.agora.set(Date.now());
  }

  protected maisDescanso(): void {
    const fim = this.fimDescanso();
    if (fim === null) return;
    this.fimDescanso.set(fim + 15_000);
    this.totalDescanso.update(t => t + 15);
  }

  protected menosDescanso(): void {
    const fim = this.fimDescanso();
    if (fim === null) return;
    // Tirar 15 s de um descanso que tem menos que isso a correr encerra o descanso.
    if (fim - Date.now() <= 15_000) {
      this.fimDescanso.set(null);
      return;
    }
    this.fimDescanso.set(fim - 15_000);
    this.totalDescanso.update(t => Math.max(1, t - 15));
  }

  protected pularDescanso(): void {
    this.fimDescanso.set(null);
  }

  // --- encerrar ---

  protected abrirResumo(): void {
    this.resumoAberto.set(true);
  }

  protected concluir(): void {
    this.encerrar('CONCLUIDA', '/historico', 'Treino salvo.');
  }

  protected abandonar(): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        panelClass: 'dialogo-confirmar',
        data: {
          titulo: 'Abandonar treino',
          mensagem: 'O treino será encerrado sem avançar a rotação.',
          confirmar: 'Abandonar',
        },
      })
      .afterClosed()
      .subscribe(ok => ok && this.encerrar('ABANDONADA', '/hoje', 'Treino abandonado.'));
  }

  private async encerrar(estado: 'CONCLUIDA' | 'ABANDONADA', destino: string, mensagem: string): Promise<void> {
    if (this.encerrando()) return;
    this.encerrando.set(true);
    try {
      const antes = this.gamificacao.dados();
      const resposta = await this.store.encerrar(estado);
      if (estado === 'CONCLUIDA' && resposta && (await this.mostrarResultado(resposta, antes))) {
        await this.roteador.navigate([destino]);
        return;
      }
      this.gamificacao.atualizar();
      this.aviso.open(this.mensagemFinal(mensagem, resposta?.xpGanho ?? 0, resposta?.recordes?.length ?? 0), undefined, {
        duration: 5000,
      });
      await this.roteador.navigate([destino]);
    } catch (e) {
      this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
    } finally {
      this.encerrando.set(false);
    }
  }

  /** Abre a tela de resultado; devolve false se não deu para montá-la (o treino já está salvo). */
  private async mostrarResultado(sessao: SessaoLocal, antes: Gamificacao | null): Promise<boolean> {
    try {
      const depois = await firstValueFrom(this.gamificacaoApi.resumo());
      this.gamificacao.dados.set(depois);
      await firstValueFrom(
        this.dialogo
          .open(ResultadoTreino, {
            panelClass: 'dialogo-confirmar',
            maxWidth: '95vw',
            width: '480px',
            data: { sessao, antes, depois },
          })
          .afterClosed(),
        { defaultValue: undefined },
      );
      return true;
    } catch {
      return false;
    }
  }

  private mensagemFinal(base: string, xp: number, recordes: number): string {
    if (xp === 0) return base;
    const pr = recordes > 0 ? ` · ${recordes} ${recordes === 1 ? 'recorde' : 'recordes'} 🏆` : '';
    return `${base} +${xp} XP${pr}`;
  }

  protected voltar(): void {
    this.roteador.navigate(['/hoje']);
  }
}
