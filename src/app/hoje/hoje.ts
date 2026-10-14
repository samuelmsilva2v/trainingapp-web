import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { PerfilApi, SessoesApi, mensagemDeErro } from '../core/api';
import { Hoje, SessaoResumo } from '../core/modelos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { seriesFeitas, totalSeries } from '../core/series';
import { duracaoMinutos, faixaReps, formatarDataRelativa } from '../core/formatos';

interface ItemCartao {
  id: string | undefined;
  nome: string;
  series: number;
  repsMin: number;
  repsMax: number;
  carga: number | null;
  descanso: number | null;
  feitas: number;
  total: number;
}

interface CartaoTreino {
  andamento: boolean;
  titulo: string;
  ordem: number;
  iniciadaEm: string | null;
  feitas: number;
  totalSeries: number;
  itens: ItemCartao[];
  /** Índice do exercício em que o treino está (primeiro com série pendente); no próximo treino, o primeiro. */
  atual: number;
}

@Component({
  selector: 'app-hoje',
  imports: [RouterLink],
  templateUrl: './hoje.html',
  styleUrl: './hoje.scss',
})
export class HojeTela implements OnInit {
  private readonly api = inject(SessoesApi);
  private readonly perfilApi = inject(PerfilApi);
  private readonly store = inject(TreinoStore);
  protected readonly gamificacao = inject(GamificacaoStore);
  private readonly roteador = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  protected readonly nome = signal<string | null>(null);
  protected readonly hoje = signal<Hoje | null>(null);
  protected readonly ultimo = signal<SessaoResumo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly ocupado = signal(false);
  protected readonly erro = signal<string | null>(null);
  /** Sem rede, mas com um treino em andamento guardado no aparelho. */
  protected readonly treinoNoAparelho = signal(false);

  protected readonly duracaoMinutos = duracaoMinutos;
  protected readonly resumoAberto = signal(false);
  /** Kg inteiros sem casas decimais; só mostra vírgula se a carga vier quebrada. */
  protected readonly kg = (v: number): string => (Number.isInteger(v) ? String(v) : v.toLocaleString('pt-BR'));

  /** O treino mostrado no cartão: o em andamento ou o próximo da rotação, no mesmo formato. */
  protected readonly cartao = computed<CartaoTreino | null>(() => {
    const h = this.hoje();
    if (!h?.planoId) return null;
    const s = h.sessaoEmAndamento;
    if (s) {
      const itens = s.exercicios.map(e => ({
        id: e.id, nome: e.nome, series: e.metaSeries, repsMin: e.metaRepsMin, repsMax: e.metaRepsMax,
        carga: e.metaCarga, descanso: e.metaDescansoSegundos,
        feitas: seriesFeitas(e), total: totalSeries(e),
      }));
      return {
        andamento: true, titulo: s.diaNome, ordem: s.diaOrdem, iniciadaEm: s.iniciadaEm, itens,
        atual: itens.findIndex(e => e.feitas < e.total),
        feitas: itens.reduce((n, e) => n + e.feitas, 0), totalSeries: itens.reduce((n, e) => n + e.total, 0),
      };
    }
    const dia = h.proximoDia;
    if (!dia) return null;
    return {
      andamento: false, titulo: dia.nome, ordem: dia.ordem, iniciadaEm: null, feitas: 0, totalSeries: 0, atual: 0,
      itens: dia.exercicios.map(e => ({
        id: e.id, nome: e.exercicioNome, series: e.series, repsMin: e.repsMin, repsMax: e.repsMax,
        carga: e.cargaAlvo, descanso: e.descansoSegundos, feitas: 0, total: e.series,
      })),
    };
  });
  protected readonly formatarDataRelativa = formatarDataRelativa;
  protected readonly faixaReps = faixaReps;

  ngOnInit(): void {
    this.perfilApi.obter().subscribe({
      next: perfil => this.nome.set(perfil.nome.trim().split(/\s+/)[0] || null),
      error: () => this.nome.set(null),
    });
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.hoje().subscribe({
      next: hoje => {
        this.hoje.set(hoje);
        this.carregando.set(false);
      },
      error: e => {
        this.erro.set(mensagemDeErro(e));
        // Sem rede: o treino em andamento guardado no aparelho ainda pode continuar.
        this.treinoNoAparelho.set(this.store.abrirDoAparelho());
        this.carregando.set(false);
      },
    });
    // O último treino pode ser concluído ou abandonado; o cartão indica qual dos dois.
    this.api.historico(0, 1).subscribe({
      next: lista => this.ultimo.set(lista[0] ?? null),
      error: () => this.ultimo.set(null),
    });
  }

  protected async iniciar(): Promise<void> {
    const hoje = this.hoje();
    if (!hoje?.planoId || !hoje.planoNome || !hoje.proximoDia || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await this.store.iniciar(hoje.planoId, hoje.planoNome, hoje.proximoDia);
      await this.roteador.navigate(['/treino']);
    } catch (e) {
      this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
    } finally {
      this.ocupado.set(false);
    }
  }

  protected continuar(): void {
    const sessao = this.hoje()?.sessaoEmAndamento;
    if (!sessao) return;
    if (this.store.sessao()?.id !== sessao.id) this.store.retomar(sessao);
    this.roteador.navigate(['/treino']);
  }

  protected pular(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.api.pular().subscribe({
      next: hoje => {
        this.hoje.set(hoje);
        this.ocupado.set(false);
      },
      error: e => {
        this.ocupado.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
      },
    });
  }
}
