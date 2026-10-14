import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { agendarFimDoDescanso, cancelarFimDoDescanso, manterTelaLigada, vibrar } from '../core/android';
import { GamificacaoApi, SessoesApi, mensagemDeErro } from '../core/api';
import { limparCarga, passoCarga } from '../core/carga';
import { cronometro, faixaReps, formatarCarga, formatarKg } from '../core/formatos';
import { Anterior, Exercicio, ExercicioLocal, Gamificacao, SerieLocal, SessaoLocal } from '../core/modelos';
import { rotuloEquipamento, rotuloGrupo } from '../core/rotulos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { ConfirmarDialogo } from '../compartilhado/confirmar-dialogo';
import { Bloco, MAX_DROPS, blocos, cargaDoDrop, ehDrop, linhasComRecorde, repsDoDrop, seriesFeitas, totalSeries } from '../core/series';
import { ResultadoTreino } from './resultado-treino';
import { DadosTroca, TrocaExercicio } from './troca-exercicio';
import { DadosSeletor, SeletorExercicio } from '../planos/seletor-exercicio/seletor-exercicio';
import { ConfigTroca, trocarExercicio } from '../core/troca';

const REPS_MAX = 1000;

@Component({
  selector: 'app-treino',
  imports: [NgTemplateOutlet],
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
  protected readonly faixaReps = faixaReps;
  protected readonly cronometro = cronometro;
  protected readonly seriesFeitas = seriesFeitas;
  protected readonly totalSeries = totalSeries;
  protected readonly maxDrops = MAX_DROPS;
  /** Sessão como a API a vê agora, com o XP que o treino renderia se fosse concluído (exato, calculado pela API). */
  protected readonly previa = signal<SessaoLocal | null>(null);
  protected readonly linhasComRecorde = computed(() => {
    const p = this.previa();
    return p ? linhasComRecorde(p) : new Set<string>();
  });

  protected xpDoExercicio(e: ExercicioLocal): number | null {
    return this.previa()?.exercicios.find(x => x.id === e.id)?.xp ?? null;
  }

  protected readonly carregando = signal(true);
  protected readonly indice = signal(0);
  /** Série (bloco: a série normal e os drops dela) aberta para edição; null = a primeira ainda não feita. */
  private readonly serieAberta = signal<number | null>(null);
  private readonly anteriores = signal<ReadonlyMap<string, Anterior>>(new Map());
  /** O drop-set é uma série só: a tela anda de bloco em bloco, e cada bloco tem um check (o da série normal). */
  protected readonly blocos = computed(() => {
    const series = this.exercicio()?.series ?? [];
    return blocos(series).map(b => ({ ...b, id: series[b.inicio].id }));
  });
  protected readonly blocoAtivo = computed(() => {
    const series = this.exercicio()?.series ?? [];
    const lista = this.blocos();
    const aberta = this.serieAberta();
    if (aberta !== null && aberta < lista.length) return aberta;
    const pendente = lista.findIndex(b => !series[b.inicio].concluida);
    return pendente === -1 ? lista.length - 1 : pendente;
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
    manterTelaLigada(true);
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

  /**
   * reps × carga da mesma etapa no último treino, ou null: série normal casa com a série normal na mesma posição,
   * e drop com o drop na mesma posição dentro dela.
   */
  protected textoAnterior(ex: ExercicioLocal, indice: number): string | null {
    const series = this.anteriores().get(ex.exercicioId)?.series ?? [];
    const atual = blocos(ex.series);
    const k = atual.findIndex(b => b.inicio === indice || b.drops.includes(indice));
    const outro = blocos(series)[k];
    if (!outro) return null;
    const d = atual[k].drops.indexOf(indice);
    const s = series[d === -1 ? outro.inicio : outro.drops[d]];
    if (!s || s.reps === null) return null;
    return s.carga === null ? `${s.reps}` : `${s.reps} × ${this.kg(s.carga)}`;
  }

  /** Ex.: "4 × 10 @ 62,5 kg" (nº de séries × reps da melhor série @ carga). */
  protected resumoAnterior(ex: ExercicioLocal): string | null {
    const series = this.anteriores().get(ex.exercicioId)?.series ?? [];
    const comCarga = series.filter(s => s.reps !== null && s.carga !== null);
    if (comCarga.length === 0) return null;
    const melhor = comCarga.reduce((m, s) => ((s.carga ?? 0) > (m.carga ?? 0) ? s : m));
    return `${blocos(series).length} × ${melhor.reps} @ ${this.kg(melhor.carga ?? 0)} kg`;
  }

  protected ativarSerie(bloco: number): void {
    this.serieAberta.set(bloco);
  }

  ngOnDestroy(): void {
    manterTelaLigada(false);
    cancelarFimDoDescanso(); // o descanso é desta tela: saindo dela, ele acaba
    if (this.intervalo) clearInterval(this.intervalo);
  }

  private tique(): void {
    const agora = Date.now();
    this.agora.set(agora);
    const fim = this.fimDescanso();
    if (fim !== null && agora >= fim) {
      this.fimDescanso.set(null);
      vibrar('forte');
    }
  }

  // --- navegação entre exercícios ---

  protected irPara(delta: -1 | 1): void {
    const total = this.sessao()?.exercicios.length ?? 0;
    this.indice.update(i => Math.min(total - 1, Math.max(0, i + delta)));
    this.serieAberta.set(null);
  }

  // --- trocar exercício (só nesta sessão) ---

  /** Só antes da primeira série concluída: série feita num exercício não passa para outro (recorde e XP errados). */
  protected readonly podeTrocar = computed(() => {
    const ex = this.exercicio();
    return !!ex && seriesFeitas(ex) === 0;
  });

  /** Seletor no grupo do original, folha "Trocar por" (normal ou drop-set) e "Anterior" do exercício novo. */
  protected trocarExercicio(): void {
    const ex = this.exercicio();
    if (!ex || !this.podeTrocar()) return;
    const indice = this.indice();
    this.dialogo
      .open<SeletorExercicio, DadosSeletor, Exercicio>(SeletorExercicio, {
        panelClass: 'dialogo-cheio',
        maxWidth: '100vw',
        width: '100vw',
        height: '100dvh',
        data: { grupo: ex.grupoMuscular },
      })
      .afterClosed()
      .subscribe(novo => {
        if (!novo) return;
        this.dialogo
          .open<TrocaExercicio, DadosTroca, ConfigTroca>(TrocaExercicio, {
            panelClass: 'dialogo-folha',
            position: { bottom: '0' },
            width: '512px',
            maxWidth: '100vw',
            data: { exercicio: novo, reps: ex.metaRepsMin },
          })
          .afterClosed()
          .subscribe(config => config && this.aplicarTroca(indice, novo, config));
      });
  }

  private aplicarTroca(indice: number, novo: Exercicio, config: ConfigTroca): void {
    // Sem histórico (ou se a busca falhar) as cargas começam vazias.
    this.api.anteriores([novo.id]).pipe(catchError(() => of([]))).subscribe(lista => {
      const anterior = lista[0];
      if (anterior) this.anteriores.update(m => new Map(m).set(novo.id, anterior));
      this.store.atualizarExercicio(indice, e =>
        trocarExercicio(e, novo, config, anterior, (reps, carga, tipo) => this.store.serieNova(reps, carga, tipo)),
      );
      this.serieAberta.set(null);
    });
  }

  // --- séries ---

  protected ajustarReps(serie: number, delta: 1 | -1): void {
    vibrar('leve');
    this.store.atualizarSerie(this.indice(), serie, s => {
      const reps = Math.min(REPS_MAX, Math.max(0, (s.reps ?? 0) + delta));
      return { ...s, reps, concluida: s.concluida && reps >= 1 };
    });
  }

  protected ajustarCarga(serie: number, delta: 1 | -1): void {
    vibrar('leve');
    this.store.atualizarSerie(this.indice(), serie, s => ({
      ...s,
      carga: passoCarga(s.carga ?? 0, delta),
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
      carga: Number.isNaN(valor) ? null : limparCarga(valor),
    }));
  }

  /** Check do bloco (na série normal): conclui o drop-set inteiro; o store copia o check para os drops. */
  protected alternarConcluida(serie: number): void {
    const ex = this.exercicio();
    const atual = ex?.series[serie];
    if (!ex || !atual || ehDrop(atual)) return;
    if (!atual.concluida && (atual.reps ?? 0) < 1) {
      this.aviso.open('Informe pelo menos 1 repetição para concluir a série.', undefined, { duration: 3000 });
      return;
    }
    this.store.atualizarSerie(this.indice(), serie, s => ({ ...s, concluida: !s.concluida }));
    if (!atual.concluida) vibrar('leve');
    this.serieAberta.set(null); // a próxima série pendente passa a ser a atual
    if (!atual.concluida && ex.metaDescansoSegundos) {
      const numero = this.blocos().findIndex(b => b.inicio === serie) + 1;
      this.iniciarDescanso(ex.metaDescansoSegundos, `${ex.nome}, série ${numero}`);
    }
  }

  protected adicionarSerie(): void {
    this.store.atualizarExercicio(this.indice(), e => {
      const ultima: SerieLocal | undefined = e.series.filter(s => !ehDrop(s)).at(-1);
      const nova = this.store.serieNova(ultima?.reps ?? e.metaRepsMin, ultima?.carga ?? e.metaCarga);
      return { ...e, series: [...e.series, nova] };
    });
    this.serieAberta.set(this.blocos().length - 1);
  }

  /** Remove a série e os drops dela. */
  protected removerSerie(bloco: Bloco): void {
    const fora = new Set([bloco.inicio, ...bloco.drops]);
    this.store.atualizarExercicio(this.indice(), e => ({ ...e, series: e.series.filter((_, i) => !fora.has(i)) }));
    this.serieAberta.set(null);
  }

  /** Drop novo no fim do bloco (só em exercício planejado como drop-set), com 80% da carga da última etapa (múltiplo de 5) e 2 reps a menos. */
  protected adicionarDrop(bloco: Bloco): void {
    if (!this.exercicio()?.metaDrops || bloco.drops.length >= MAX_DROPS) return;
    const fim = bloco.drops.at(-1) ?? bloco.inicio;
    this.store.atualizarExercicio(this.indice(), e => {
      const drop = this.store.serieNova(repsDoDrop(e.series[fim].reps), cargaDoDrop(e.series[fim].carga), 'DROP');
      return { ...e, series: [...e.series.slice(0, fim + 1), drop, ...e.series.slice(fim + 1)] };
    });
  }

  protected removerDrop(serie: number): void {
    this.store.atualizarExercicio(this.indice(), e => ({ ...e, series: e.series.filter((_, i) => i !== serie) }));
  }

  // --- descanso ---

  /** Texto da notificação do descanso em curso (exercício e série), para reagendar ao somar ou tirar tempo. */
  private textoDescanso = '';

  private iniciarDescanso(segundos: number, texto: string): void {
    this.textoDescanso = texto;
    this.totalDescanso.set(segundos);
    this.definirFimDescanso(Date.now() + segundos * 1000);
    this.agora.set(Date.now());
  }

  /** Muda o fim do descanso na tela e na notificação do app (null encerra os dois). */
  private definirFimDescanso(fim: number | null): void {
    this.fimDescanso.set(fim);
    if (fim === null) cancelarFimDoDescanso();
    else void agendarFimDoDescanso(fim, this.textoDescanso);
  }

  protected maisDescanso(): void {
    const fim = this.fimDescanso();
    if (fim === null) return;
    this.definirFimDescanso(fim + 15_000);
    this.totalDescanso.update(t => t + 15);
  }

  protected menosDescanso(): void {
    const fim = this.fimDescanso();
    if (fim === null) return;
    // Tirar 15 s de um descanso que tem menos que isso a correr encerra o descanso.
    if (fim - Date.now() <= 15_000) {
      this.definirFimDescanso(null);
      return;
    }
    this.definirFimDescanso(fim - 15_000);
    this.totalDescanso.update(t => Math.max(1, t - 15));
  }

  protected pularDescanso(): void {
    this.definirFimDescanso(null);
  }

  // --- encerrar ---

  protected abrirResumo(): void {
    this.previa.set(null);
    this.resumoAberto.set(true);
    void this.carregarPrevia();
  }

  /** Salva o treino e pede à API o XP exato; sem rede ou com erro, o XP fica como "—". */
  private async carregarPrevia(): Promise<void> {
    try {
      await this.store.sincronizar();
      const id = this.store.sessao()?.id;
      if (!id || this.store.status() === 'erro') return;
      this.previa.set(await firstValueFrom(this.api.obter(id)));
    } catch {
      this.previa.set(null);
    }
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
