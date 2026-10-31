import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { PerfilApi, PesoApi, SessoesApi, mensagemDeErro } from '../core/api';
import { Hoje, Peso, SessaoResumo } from '../core/modelos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { atualizarContextoDoLembrete } from '../core/lembrete';
import { diasEntre, hojeIso, pesagemPendente } from '../core/peso';
import { TreinoStore } from '../core/treino-store';
import { falhaDe, Falha } from '../core/falha';
import { TelaErro } from '../compartilhado/tela-erro';
import { seriesFeitas, totalSeries } from '../core/series';
import { duracaoMinutos, faixaReps, formatarDataRelativa, kg } from '../core/formatos';
import { RegistrarPeso, RegistrarPesoDados } from '../compartilhado/registrar-peso';

/** Data (AAAA-MM-DD) em que o lembrete de pesagem foi adiado com "Agora não": conveniência deste aparelho. */
const CHAVE_PESAGEM_ADIADA = 'trainingapp.pesagem.adiadaEm';

function lerAdiamento(): string | null {
  try {
    return localStorage.getItem(CHAVE_PESAGEM_ADIADA);
  } catch {
    return null;
  }
}

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
  imports: [RouterLink, TelaErro],
  templateUrl: './hoje.html',
  styleUrl: './hoje.scss',
})
export class HojeTela implements OnInit {
  private readonly api = inject(SessoesApi);
  private readonly perfilApi = inject(PerfilApi);
  private readonly pesoApi = inject(PesoApi);
  private readonly dialogo = inject(MatDialog);
  private readonly store = inject(TreinoStore);
  protected readonly gamificacao = inject(GamificacaoStore);

  constructor() {
    // O lembrete de treino (só no app) usa o próximo dia da rotação no texto e não avisa se hoje já houve treino.
    effect(() => {
      const hoje = this.hoje();
      const dados = this.gamificacao.dados();
      if (hoje && dados) atualizarContextoDoLembrete(hoje.proximoDia?.nome ?? null, dados.treinouHoje);
    });
  }
  private readonly roteador = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  protected readonly nome = signal<string | null>(null);
  protected readonly hoje = signal<Hoje | null>(null);
  protected readonly ultimo = signal<SessaoResumo | null>(null);
  /** O histórico já respondeu (com ou sem treino): até lá o cartão do último treino guarda o lugar. */
  protected readonly ultimoCarregado = signal(false);
  protected readonly carregando = signal(true);
  protected readonly ocupado = signal(false);
  protected readonly erro = signal<Falha | null>(null);
  /** Sem rede, mas com um treino em andamento guardado no aparelho. */
  protected readonly treinoNoAparelho = signal(false);

  protected readonly duracaoMinutos = duracaoMinutos;
  protected readonly resumoAberto = signal(false);
  protected readonly kg = kg;

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

  // Lembrete de pesagem: as pesagens só são buscadas com o lembrete ligado no perfil.
  private readonly pesos = signal<Peso[] | null>(null);
  private readonly lembretePesoDias = signal<number | null>(null);
  private readonly pesagemAdiadaEm = signal(lerAdiamento());
  protected readonly lembrarPesagem = computed(() => {
    const pesos = this.pesos();
    return pesos !== null && pesagemPendente(pesos, this.lembretePesoDias(), hojeIso(), this.pesagemAdiadaEm());
  });
  protected readonly textoPesagem = computed(() => {
    const ultima = this.pesos()?.at(-1);
    return ultima
      ? `Sua última pesagem foi há ${diasEntre(ultima.data, hojeIso())} dias.`
      : 'Registre seu peso para acompanhar a evolução.';
  });

  ngOnInit(): void {
    this.perfilApi.obter().subscribe({
      next: perfil => {
        this.nome.set(perfil.nome.trim().split(/\s+/)[0] || null);
        this.lembretePesoDias.set(perfil.lembretePesoDias);
        if (perfil.lembretePesoDias) this.pesoApi.listar().subscribe({ next: pesos => this.pesos.set(pesos), error: () => {} });
      },
      error: () => this.nome.set(null),
    });
    this.carregar();
  }

  /** O mesmo diálogo do Perfil; registrado o peso de hoje, o lembrete some. */
  protected registrarPeso(): void {
    this.dialogo
      .open<RegistrarPeso, RegistrarPesoDados, Peso>(RegistrarPeso, {
        panelClass: 'dialogo-folha',
        position: { bottom: '0' },
        width: '512px',
        maxWidth: '100vw',
        data: { pesos: this.pesos() ?? [] },
      })
      .afterClosed()
      .subscribe(peso => {
        if (!peso) return;
        this.pesos.update(lista => [...(lista ?? []).filter(p => p.data !== peso.data), peso].sort((a, b) => a.data.localeCompare(b.data)));
        this.aviso.open('Peso registrado.', undefined, { duration: 3000 });
      });
  }

  /** "Agora não": esconde o lembrete até amanhã, neste aparelho. */
  protected adiarPesagem(): void {
    const hoje = hojeIso();
    try {
      localStorage.setItem(CHAVE_PESAGEM_ADIADA, hoje);
    } catch {
      // sem armazenamento: o lembrete fica escondido só até recarregar
    }
    this.pesagemAdiadaEm.set(hoje);
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
        this.erro.set(falhaDe(e));
        // Sem rede: o treino em andamento guardado no aparelho ainda pode continuar.
        this.treinoNoAparelho.set(this.store.abrirDoAparelho());
        this.carregando.set(false);
      },
    });
    // O último treino pode ser concluído ou abandonado; o cartão indica qual dos dois.
    this.ultimoCarregado.set(false);
    this.api.historico(0, 1).subscribe({
      next: lista => {
        this.ultimo.set(lista[0] ?? null);
        this.ultimoCarregado.set(true);
      },
      error: () => {
        this.ultimo.set(null);
        this.ultimoCarregado.set(true);
      },
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
