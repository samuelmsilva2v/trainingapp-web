import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GamificacaoApi, SessoesApi, mensagemDeErro } from '../core/api';
import { cronometro, formatarCarga, formatarKg, formatarRazao } from '../core/formatos';
import { Gamificacao, SerieLocal, SessaoLocal } from '../core/modelos';
import { rotuloEquipamento, rotuloGrupo } from '../core/rotulos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { ConfirmarDialogo } from '../compartilhado/confirmar-dialogo';
import { coeficienteDeCarga, comparacaoComUltimo, melhorSerie, seriesFeitas } from '../core/coeficiente';
import { ResultadoTreino } from './resultado-treino';

const PASSO_CARGA = 2.5;
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
  protected readonly formatarKg = formatarKg;
  protected readonly formatarRazao = formatarRazao;
  protected readonly cronometro = cronometro;
  protected readonly seriesFeitas = seriesFeitas;
  protected readonly melhorSerie = melhorSerie;
  protected readonly coeficiente = computed(() => {
    const s = this.store.sessao();
    return s ? coeficienteDeCarga(s) : null;
  });

  protected readonly carregando = signal(true);
  protected readonly indice = signal(0);
  protected readonly menuAberto = signal(false);
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
      return;
    }
    // Recarregou a página no meio do treino: a API guarda a sessão em andamento.
    this.api.hoje().subscribe({
      next: hoje => {
        if (hoje.sessaoEmAndamento) {
          this.store.retomar(hoje.sessaoEmAndamento);
          this.carregando.set(false);
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
    return Math.round(Math.min(CARGA_MAX, Math.max(0, valor)) * 100) / 100;
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
  }

  protected removerSerie(serie: number): void {
    this.store.atualizarExercicio(this.indice(), e => ({ ...e, series: e.series.filter((_, i) => i !== serie) }));
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

  protected pularDescanso(): void {
    this.fimDescanso.set(null);
  }

  // --- encerrar ---

  protected abrirResumo(): void {
    this.menuAberto.set(false);
    this.resumoAberto.set(true);
  }

  protected concluir(): void {
    this.encerrar('CONCLUIDA', '/historico', 'Treino salvo.');
  }

  protected abandonar(): void {
    this.menuAberto.set(false);
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
      const [depois, historico] = await Promise.all([
        firstValueFrom(this.gamificacaoApi.resumo()),
        firstValueFrom(this.api.historico(0, 30)).catch(() => []),
      ]);
      this.gamificacao.dados.set(depois);
      await firstValueFrom(
        this.dialogo
          .open(ResultadoTreino, {
            panelClass: 'dialogo-confirmar',
            maxWidth: '95vw',
            width: '480px',
            data: { sessao, antes, depois, comparacao: comparacaoComUltimo(sessao, historico) },
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
