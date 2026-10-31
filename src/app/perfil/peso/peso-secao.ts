import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PesoApi, mensagemDeErro } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { TelaErro } from '../../compartilhado/tela-erro';
import { Carregando } from '../../compartilhado/carregando';
import { Peso } from '../../core/modelos';
import { diasEntre, hojeIso, tendencia } from '../../core/peso';
import { ConfirmarDialogo } from '../../compartilhado/confirmar-dialogo';
import { RegistrarPeso, RegistrarPesoDados } from '../../compartilhado/registrar-peso';

/** Dias do período do gráfico; 0 = tudo. */
type Periodo = 30 | 90 | 0;

// Área do gráfico no viewBox do SVG: margem à esquerda para os rótulos de kg e embaixo para as datas.
const LARGURA = 320;
const ALTURA = 168;
const ESQ = 36;
const DIR = 8;
const TOPO = 10;
const BASE = 22;

/** Pesagens mínimas para mostrar a tendência. */
const MIN_TENDENCIA = 5;
/** Pesagens por vez na lista (o "Mostrar mais" abre mais esse tanto). */
const POR_PAGINA = 5;

const KG = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const KG_1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "19 de out" (com o ano se não for o atual). O meio-dia evita cair no dia anterior em fuso negativo. */
function formatarDia(data: string): string {
  const dia = new Date(`${data}T12:00`);
  const ano = dia.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {};
  return dia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...ano }).replaceAll('.', '');
}

/** Bloco de peso dos Dados pessoais do Perfil (sempre em kg): último peso, variação, gráfico com tendência e lista. */
@Component({
  selector: 'app-peso-secao',
  imports: [TelaErro, Carregando],
  templateUrl: './peso-secao.html',
  styleUrl: './peso-secao.scss',
})
export class PesoSecao implements OnInit {
  private readonly api = inject(PesoApi);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly periodos: { valor: Periodo; rotulo: string }[] = [
    { valor: 30, rotulo: '30 dias' },
    { valor: 90, rotulo: '90 dias' },
    { valor: 0, rotulo: 'Tudo' },
  ];
  protected readonly kg = (v: number) => KG.format(v);
  protected readonly kg1 = (v: number) => KG_1.format(v);
  protected readonly dia = formatarDia;
  protected readonly largura = LARGURA;
  protected readonly altura = ALTURA;

  protected readonly carregando = signal(true);
  protected readonly erro = signal<Falha | null>(null);
  protected readonly pesos = signal<Peso[]>([]);
  protected readonly periodo = signal<Periodo>(30);
  protected readonly listaAberta = signal(false);
  protected readonly mostrando = signal(POR_PAGINA);

  private readonly tendencias = computed(() => tendencia(this.pesos()));
  /** Com poucas pesagens a média só atrasa em relação aos pontos e parece errada: fica escondida. */
  private readonly comTendencia = computed(() => this.pesos().length >= MIN_TENDENCIA);
  protected readonly ultimo = computed(() => this.pesos().at(-1) ?? null);
  protected readonly tendenciaAtual = computed(() => (this.comTendencia() ? (this.tendencias().at(-1) ?? null) : null));
  protected readonly variacao = computed(() => {
    const p = this.pesos();
    return p.length < 2 ? null : { kg: p[p.length - 1].kg - p[p.length - 2].kg, desde: p[p.length - 2].data };
  });

  /** Pesagens do período, com a tendência calculada sobre todas (a do início do período já vem do histórico). */
  protected readonly visiveis = computed(() => {
    const pesos = this.pesos();
    const t = this.tendencias();
    const periodo = this.periodo();
    const inicio = periodo ? hojeIso(new Date(Date.now() - periodo * 86_400_000)) : (pesos[0]?.data ?? '');
    return pesos.map((p, i) => ({ ...p, tendencia: t[i] })).filter(p => p.data >= inicio);
  });

  protected readonly grafico = computed(() => {
    const pontos = this.visiveis();
    if (!pontos.length) return null;
    const periodo = this.periodo();
    const fim = periodo ? hojeIso() : pontos[pontos.length - 1].data;
    const inicio = periodo ? hojeIso(new Date(Date.now() - periodo * 86_400_000)) : pontos[0].data;
    const dias = diasEntre(inicio, fim);

    const comTendencia = this.comTendencia();
    const valores = pontos.flatMap(p => (comTendencia ? [p.kg, p.tendencia] : [p.kg]));
    // Eixo em kg inteiros (os rótulos batem com a grade) e com pelo menos 2 kg de faixa, para não exagerar a oscilação.
    let min = Math.floor(Math.min(...valores));
    let max = Math.ceil(Math.max(...valores));
    if (max - min < 2) {
      min -= Math.ceil((2 - (max - min)) / 2);
      max = min + 2;
    }
    const largura = LARGURA - ESQ - DIR;
    const altura = ALTURA - TOPO - BASE;
    const x = (data: string) => ESQ + (dias ? (diasEntre(inicio, data) / dias) * largura : largura / 2);
    const y = (kg: number) => TOPO + ((max - kg) / (max - min)) * altura;

    return {
      pontos: pontos.map(p => ({ x: x(p.data), y: y(p.kg), titulo: `${formatarDia(p.data)}: ${KG.format(p.kg)} kg` })),
      linhaPesos: pontos.map(p => `${x(p.data).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' '),
      linhaTendencia: comTendencia ? pontos.map(p => `${x(p.data).toFixed(1)},${y(p.tendencia).toFixed(1)}`).join(' ') : null,
      grade: [max, (max + min) / 2, min].map(kg => ({ y: y(kg), rotulo: KG.format(kg) })),
      datas: [
        { x: ESQ, rotulo: formatarDia(inicio), ancora: 'start' },
        { x: LARGURA - DIR, rotulo: formatarDia(fim), ancora: 'end' },
      ],
      direita: LARGURA - DIR,
      baseDatas: ALTURA - 6,
    };
  });

  protected readonly descricaoGrafico = computed(() => {
    const v = this.visiveis();
    if (!v.length) return '';
    const tendencia = this.tendenciaAtual();
    return `Gráfico com ${v.length} ${v.length === 1 ? 'pesagem' : 'pesagens'}, de ${KG.format(Math.min(...v.map(p => p.kg)))} a ` +
      `${KG.format(Math.max(...v.map(p => p.kg)))} kg` + (tendencia === null ? '.' : `; tendência atual de ${KG_1.format(tendencia)} kg.`);
  });

  /** Lista da mais recente para a mais antiga. */
  protected readonly lista = computed(() => [...this.pesos()].reverse());
  protected readonly listaVisivel = computed(() => this.lista().slice(0, this.mostrando()));

  protected mostrarMais(): void {
    this.mostrando.update(n => n + POR_PAGINA);
  }

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.listar().subscribe({
      next: pesos => {
        this.pesos.set(pesos);
        this.carregando.set(false);
      },
      error: e => {
        this.erro.set(falhaDe(e));
        this.carregando.set(false);
      },
    });
  }

  protected registrar(): void {
    this.dialogo
      .open<RegistrarPeso, RegistrarPesoDados, Peso>(RegistrarPeso, {
        panelClass: 'dialogo-folha',
        position: { bottom: '0' },
        width: '512px',
        maxWidth: '100vw',
        data: { pesos: this.pesos() },
      })
      .afterClosed()
      .subscribe(peso => {
        if (!peso) return;
        this.pesos.update(lista => [...lista.filter(p => p.data !== peso.data), peso].sort((a, b) => a.data.localeCompare(b.data)));
        this.aviso.open('Peso registrado.', undefined, { duration: 3000 });
      });
  }

  protected excluir(peso: Peso): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        panelClass: 'dialogo-confirmar',
        data: { titulo: 'Excluir pesagem', mensagem: `${KG.format(peso.kg)} kg em ${formatarDia(peso.data)} será removida.`, confirmar: 'Excluir' },
      })
      .afterClosed()
      .subscribe(confirmou => {
        if (!confirmou) return;
        this.api.excluir(peso.data).subscribe({
          next: () => this.pesos.update(lista => lista.filter(p => p.data !== peso.data)),
          error: e => this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 }),
        });
      });
  }
}
