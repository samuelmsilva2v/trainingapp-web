import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ConfirmarDialogo } from '../compartilhado/confirmar-dialogo';
import { SessoesApi, mensagemDeErro } from '../core/api';
import { GamificacaoStore } from '../core/gamificacao-store';
import { duracaoMinutos, formatarCarga, formatarDataRelativa } from '../core/formatos';
import { SessaoLocal, SessaoResumo } from '../core/modelos';
import { Periodo, inicioDaCobertura, partesDoTempo, resumirPeriodo, rotuloDoPeriodo } from './resumo';

const TAMANHO_PAGINA = 20;

interface Mes {
  chave: string;
  rotulo: string;
  sessoes: SessaoResumo[];
  concluidas: number;
}

@Component({
  selector: 'app-historico',
  imports: [RouterLink],
  templateUrl: './historico.html',
  styleUrl: './historico.scss',
})
export class Historico implements OnInit {
  private readonly api = inject(SessoesApi);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);
  private readonly gamificacao = inject(GamificacaoStore);

  protected readonly sessoes = signal<SessaoResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly temMais = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly abertas = signal<ReadonlySet<string>>(new Set());
  protected readonly detalhes = signal<ReadonlyMap<string, SessaoLocal>>(new Map());
  protected readonly erroDetalhe = signal<string | null>(null);
  protected readonly periodo = signal<Periodo>('SEMANA');

  protected readonly duracaoMinutos = duracaoMinutos;
  protected readonly formatarCarga = formatarCarga;
  protected readonly formatarDataRelativa = formatarDataRelativa;
  protected readonly partesDoTempo = partesDoTempo;

  private pagina = 0;
  private readonly hoje = new Date();
  /** O resumo da semana e do mês só fica certo com o histórico carregado até aqui. */
  private readonly cobertura = inicioDaCobertura(this.hoje).getTime();

  protected readonly resumo = computed(() => resumirPeriodo(this.sessoes(), this.periodo(), this.hoje));
  protected readonly rotuloPeriodo = computed(() => rotuloDoPeriodo(this.periodo(), this.hoje));

  protected readonly meses = computed<Mes[]>(() => {
    const porMes = new Map<string, Mes>();
    for (const s of this.sessoes()) {
      const data = new Date(s.iniciadaEm);
      const chave = `${data.getFullYear()}-${data.getMonth()}`;
      let mes = porMes.get(chave);
      if (!mes) {
        const rotulo = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        mes = { chave, rotulo, sessoes: [], concluidas: 0 };
        porMes.set(chave, mes);
      }
      mes.sessoes.push(s);
      if (s.estado === 'CONCLUIDA') mes.concluidas++;
    }
    return [...porMes.values()];
  });

  ngOnInit(): void {
    this.carregarPagina();
  }

  protected carregarPagina(): void {
    const primeira = this.pagina === 0;
    (primeira ? this.carregando : this.carregandoMais).set(true);
    this.erro.set(null);
    this.api.historico(this.pagina, TAMANHO_PAGINA).subscribe({
      next: lista => {
        this.sessoes.update(atual => [...atual, ...lista]);
        this.temMais.set(lista.length === TAMANHO_PAGINA);
        this.pagina++;
        this.carregando.set(false);
        this.carregandoMais.set(false);
        // Segue buscando enquanto a página mais antiga ainda cai dentro do período do resumo.
        const maisAntiga = lista.at(-1);
        if (this.temMais() && maisAntiga && new Date(maisAntiga.iniciadaEm).getTime() >= this.cobertura) this.carregarPagina();
      },
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
        this.carregandoMais.set(false);
      },
    });
  }

  protected alternar(sessao: SessaoResumo): void {
    const abertas = new Set(this.abertas());
    if (abertas.delete(sessao.id)) {
      this.abertas.set(abertas);
      return;
    }
    abertas.add(sessao.id);
    this.abertas.set(abertas);
    this.erroDetalhe.set(null);
    if (this.detalhes().has(sessao.id)) return;
    this.api.obter(sessao.id).subscribe({
      next: detalhe => this.detalhes.update(m => new Map(m).set(sessao.id, detalhe)),
      error: e => this.erroDetalhe.set(mensagemDeErro(e)),
    });
  }

  protected apagar(sessao: SessaoResumo): void {
    const estorno = [
      sessao.xpGanho > 0 ? `${sessao.xpGanho} XP` : '',
      sessao.recordes > 0 ? `${sessao.recordes} ${sessao.recordes === 1 ? 'recorde' : 'recordes'}` : '',
    ].filter(Boolean).join(' e ');
    this.dialogo
      .open(ConfirmarDialogo, {
        panelClass: 'dialogo-confirmar',
        data: {
          titulo: 'Apagar treino',
          mensagem: `"${sessao.diaNome}" sai do histórico${estorno ? ` e ${estorno} serão estornados` : ''}. Isso não pode ser desfeito.`,
          confirmar: 'Apagar',
        },
      })
      .afterClosed()
      .subscribe(ok => ok && this.excluir(sessao));
  }

  private excluir(sessao: SessaoResumo): void {
    this.api.excluir(sessao.id).subscribe({
      next: () => {
        this.sessoes.update(lista => lista.filter(s => s.id !== sessao.id));
        this.gamificacao.atualizar();
        this.aviso.open(`Treino apagado${sessao.xpGanho > 0 ? ` · −${sessao.xpGanho} XP` : ''}`, undefined, { duration: 4000 });
      },
      error: e => this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 }),
    });
  }

  protected diaSemana(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }
}
