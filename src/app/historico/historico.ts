import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessoesApi, mensagemDeErro } from '../core/api';
import { duracaoMinutos, formatarCarga, formatarDataRelativa, formatarKg } from '../core/formatos';
import { SessaoLocal, SessaoResumo } from '../core/modelos';

const TAMANHO_PAGINA = 20;

interface Mes {
  chave: string;
  rotulo: string;
  sessoes: SessaoResumo[];
  concluidas: number;
  volumeKg: number;
}

@Component({
  selector: 'app-historico',
  imports: [RouterLink],
  templateUrl: './historico.html',
  styleUrl: './historico.scss',
})
export class Historico implements OnInit {
  private readonly api = inject(SessoesApi);

  protected readonly sessoes = signal<SessaoResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly temMais = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly abertas = signal<ReadonlySet<string>>(new Set());
  protected readonly detalhes = signal<ReadonlyMap<string, SessaoLocal>>(new Map());
  protected readonly erroDetalhe = signal<string | null>(null);

  protected readonly duracaoMinutos = duracaoMinutos;
  protected readonly formatarCarga = formatarCarga;
  protected readonly formatarKg = formatarKg;
  protected readonly formatarDataRelativa = formatarDataRelativa;

  private pagina = 0;

  protected readonly meses = computed<Mes[]>(() => {
    const porMes = new Map<string, Mes>();
    for (const s of this.sessoes()) {
      const data = new Date(s.iniciadaEm);
      const chave = `${data.getFullYear()}-${data.getMonth()}`;
      let mes = porMes.get(chave);
      if (!mes) {
        const rotulo = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        mes = { chave, rotulo, sessoes: [], concluidas: 0, volumeKg: 0 };
        porMes.set(chave, mes);
      }
      mes.sessoes.push(s);
      if (s.estado === 'CONCLUIDA') {
        mes.concluidas++;
        mes.volumeKg += s.volumeKg;
      }
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

  protected diaSemana(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }
}
