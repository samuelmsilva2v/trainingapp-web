import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanosApi, mensagemDeErro } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { TelaErro } from '../../compartilhado/tela-erro';
import { Carregando } from '../../compartilhado/carregando';
import { DiaPlano, Exercicio, ItemPlano, Objetivo, Plano, PlanoRequest } from '../../core/modelos';
import { OBJETIVOS, rotuloEquipamento, rotuloGrupo } from '../../core/rotulos';
import { lerPassoCarga, limparCarga, passoCarga } from '../../core/carga';
import { MAX_DROPS, ehPesoCorporal, repsDoDrop } from '../../core/series';
import { ConfirmarDialogo } from '../../compartilhado/confirmar-dialogo';
import { NovoExercicio } from '../novo-exercicio/novo-exercicio';
import { SeletorExercicio } from '../seletor-exercicio/seletor-exercicio';

const SERIES = { min: 1, max: 20 };
const REPS = { min: 1, max: 100 };
const DESCANSO = { passo: 15, max: 1800 };

/** Aplica um valor a um campo respeitando os limites da API; reps mín nunca passa da máx. */
export function definirCampo(item: ItemPlano, campo: CampoNumerico, valor: number | null): ItemPlano {
  const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));
  const novo = { ...item };
  switch (campo) {
    case 'series':
      if (valor !== null) novo.series = limitar(valor, SERIES.min, SERIES.max);
      break;
    case 'repsMin':
      if (valor !== null) novo.repsMin = limitar(valor, REPS.min, REPS.max);
      novo.repsMax = Math.max(novo.repsMax, novo.repsMin);
      break;
    case 'repsMax':
      if (valor !== null) novo.repsMax = limitar(valor, REPS.min, REPS.max);
      novo.repsMin = Math.min(novo.repsMin, novo.repsMax);
      break;
    case 'reps':
      // Drop-set: um número só (as reps da primeira etapa); os drops sobem de 2 em 2 a partir dele.
      if (valor !== null) novo.repsMin = novo.repsMax = limitar(valor, REPS.min, REPS.max);
      break;
    case 'cargaAlvo':
      novo.cargaAlvo = valor === null || limparCarga(valor) <= 0 ? null : limparCarga(valor);
      break;
    case 'descansoSegundos':
      novo.descansoSegundos = valor === null || valor <= 0 ? null : limitar(valor, 1, DESCANSO.max);
      break;
    case 'etapas':
      // Etapas do drop-set contando a primeira (6 com 3 etapas = 6-8-10): 2 a 4, gravadas como drops = etapas - 1.
      // Só o interruptor volta a 0 drops (série normal).
      novo.drops = limitar((valor ?? 2) - 1, 1, MAX_DROPS);
      break;
  }
  return novo;
}

type CampoNumerico = 'series' | 'repsMin' | 'repsMax' | 'reps' | 'cargaAlvo' | 'descansoSegundos' | 'etapas';

@Component({
  selector: 'app-plano-editor',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, TelaErro, Carregando],
  templateUrl: './plano-editor.html',
  styleUrl: './plano-editor.scss',
})
export class PlanoEditor implements OnInit {
  private readonly api = inject(PlanosApi);
  private readonly rota = inject(ActivatedRoute);
  private readonly roteador = inject(Router);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly objetivos = OBJETIVOS;
  protected readonly rotuloGrupo = rotuloGrupo;
  protected readonly rotuloEquipamento = rotuloEquipamento;
  protected readonly pesoCorporal = ehPesoCorporal;

  protected readonly id = this.rota.snapshot.paramMap.get('id');
  protected readonly carregando = signal(this.id !== null);
  protected readonly salvando = signal(false);
  protected readonly erroCarga = signal<Falha | null>(null);

  protected readonly nome = signal('');
  protected readonly objetivo = signal<Objetivo>('HIPERTROFIA');
  protected readonly dias = signal<DiaPlano[]>([{ nome: 'Treino A', exercicios: [] }]);
  protected readonly diaAtivo = signal(0);

  protected readonly dia = computed(() => this.dias()[this.diaAtivo()]);
  protected readonly podeSalvar = computed(
    () => this.nome().trim().length > 0 && this.dias().length > 0 && this.dias().every(d => d.nome.trim().length > 0),
  );

  // Foto do plano ao abrir (ou ao salvar): sair com algo diferente dela pergunta antes de descartar.
  private baseline = this.fotografar();

  ngOnInit(): void {
    if (this.id) this.carregar(this.id);
  }

  /** Usado pelo guard canDeactivate das rotas do editor. */
  podeSair(): boolean | Observable<boolean> {
    if (this.fotografar() === this.baseline) return true;
    return this.dialogo
      .open(ConfirmarDialogo, {
        panelClass: 'dialogo-confirmar',
        data: {
          titulo: 'Descartar alterações',
          mensagem: 'As alterações deste plano ainda não foram salvas.',
          confirmar: 'Descartar',
        },
      })
      .afterClosed()
      .pipe(map(ok => ok === true));
  }

  private fotografar(): string {
    return JSON.stringify([this.nome(), this.objetivo(), this.dias()]);
  }

  protected carregar(id: string): void {
    this.carregando.set(true);
    this.erroCarga.set(null);
    this.api.obter(id).subscribe({
      next: plano => {
        this.preencher(plano);
        this.carregando.set(false);
      },
      error: e => {
        this.erroCarga.set(falhaDe(e));
        this.carregando.set(false);
      },
    });
  }

  private preencher(plano: Plano): void {
    this.nome.set(plano.nome);
    this.objetivo.set(plano.objetivo);
    this.dias.set(plano.dias.length ? plano.dias : [{ nome: 'Treino A', exercicios: [] }]);
    this.diaAtivo.set(0);
    this.baseline = this.fotografar();
  }

  // --- dias ---

  protected adicionarDia(): void {
    const letra = String.fromCharCode(65 + (this.dias().length % 26));
    this.dias.update(d => [...d, { nome: `Treino ${letra}`, exercicios: [] }]);
    this.diaAtivo.set(this.dias().length - 1);
  }

  /** No toque, segurar um instante antes de arrastar: assim a faixa de dias ainda rola com o dedo. */
  protected readonly atrasoArrasto = { touch: 250, mouse: 0 };

  /** Reordena a rotação; a aba selecionada continua sendo o mesmo dia, onde quer que ele tenha parado. */
  protected reordenarDias(evento: CdkDragDrop<DiaPlano[]>): void {
    const ativo = this.dia();
    const dias = [...this.dias()];
    moveItemInArray(dias, evento.previousIndex, evento.currentIndex);
    this.dias.set(dias);
    this.diaAtivo.set(dias.indexOf(ativo));
  }

  protected renomearDia(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.atualizarDia(this.diaAtivo(), d => ({ ...d, nome: valor }));
  }

  protected removerDia(): void {
    const indice = this.diaAtivo();
    const remover = () => {
      this.dias.update(d => d.filter((_, i) => i !== indice));
      this.diaAtivo.set(Math.max(0, indice - 1));
    };
    if (this.dia().exercicios.length === 0) return remover();
    this.confirmar('Remover dia', `"${this.dia().nome}" e seus exercícios serão removidos do plano.`, 'Remover', remover);
  }

  // --- exercícios ---

  protected escolherExercicio(): void {
    this.dialogo
      .open<SeletorExercicio, void, Exercicio>(SeletorExercicio, {
        panelClass: 'dialogo-cheio',
        maxWidth: '100vw',
        width: '100vw',
        height: '100dvh',
      })
      .afterClosed()
      .subscribe(exercicio => exercicio && this.incluirExercicio(exercicio));
  }

  /** Cria um exercício próprio (folha na base da tela) e já o coloca no dia aberto. */
  protected criarExercicio(): void {
    this.dialogo
      .open<NovoExercicio, void, Exercicio>(NovoExercicio, {
        panelClass: 'dialogo-folha',
        position: { bottom: '0' },
        width: '512px',
        maxWidth: '100vw',
      })
      .afterClosed()
      .subscribe(exercicio => {
        if (!exercicio) return;
        this.incluirExercicio(exercicio);
        this.aviso.open('Exercício criado e adicionado ao dia.', undefined, { duration: 3000 });
      });
  }

  private incluirExercicio(exercicio: Exercicio): void {
    const item: ItemPlano = {
      exercicioId: exercicio.id,
      exercicioNome: exercicio.nome,
      grupoMuscular: exercicio.grupoMuscular,
      equipamento: exercicio.equipamento,
      series: 3,
      repsMin: 8,
      repsMax: 12,
      cargaAlvo: null,
      descansoSegundos: 90,
    };
    this.atualizarDia(this.diaAtivo(), d => ({ ...d, exercicios: [...d.exercicios, item] }));
  }

  protected remover(indice: number): void {
    this.atualizarDia(this.diaAtivo(), d => ({ ...d, exercicios: d.exercicios.filter((_, i) => i !== indice) }));
  }

  protected reordenar(evento: CdkDragDrop<ItemPlano[]>): void {
    this.atualizarDia(this.diaAtivo(), d => {
      const exercicios = [...d.exercicios];
      moveItemInArray(exercicios, evento.previousIndex, evento.currentIndex);
      return { ...d, exercicios };
    });
  }

  /**
   * Interruptor "Drop-set": ligar começa com 2 etapas (1 drop) em cada série e troca a faixa de reps por um número só
   * (o mínimo da faixa vira as reps da primeira etapa); desligar volta às séries normais.
   */
  protected alternarDropSet(indice: number): void {
    this.atualizarItem(indice, item =>
      (item.drops ?? 0) > 0 ? { ...item, drops: 0 } : { ...item, drops: 1, repsMax: item.repsMin },
    );
  }

  /** Reps de cada etapa, para mostrar no card: 6 reps com 3 etapas dá "6, 8 e 10". */
  protected repsDasEtapas(item: ItemPlano): string {
    const reps: number[] = [item.repsMin];
    let atual: number | null = item.repsMin;
    for (let d = 0; d < (item.drops ?? 0); d++) {
      atual = repsDoDrop(atual);
      if (atual !== null) reps.push(atual);
    }
    return reps.slice(0, -1).join(', ') + ' e ' + reps.at(-1);
  }

  /** Incrementa/decrementa um campo (botões + e −). */
  protected ajustar(indice: number, campo: CampoNumerico, sinal: 1 | -1): void {
    this.atualizarItem(indice, item => {
      switch (campo) {
        case 'cargaAlvo':
          // Mesma grade do treino (passo das Configurações); de vazio, "+" começa no passo e "−" até zero volta a vazio.
          if (item.cargaAlvo === null) return definirCampo(item, campo, sinal > 0 ? lerPassoCarga() : null);
          return definirCampo(item, campo, passoCarga(item.cargaAlvo, sinal));
        case 'descansoSegundos':
          return definirCampo(item, campo, this.passo(item.descansoSegundos, sinal, DESCANSO.passo, DESCANSO.max));
        case 'etapas':
          return definirCampo(item, campo, (item.drops ?? 0) + 1 + sinal);
        case 'reps':
          return definirCampo(item, campo, item.repsMin + sinal);
        default:
          return definirCampo(item, campo, item[campo] + sinal);
      }
    });
  }

  /** Valor digitado: aceita vírgula decimal; carga e descanso vazios viram "sem valor", texto inválido é descartado. */
  protected digitar(indice: number, campo: CampoNumerico, evento: Event): void {
    const campoHtml = evento.target as HTMLInputElement;
    const texto = campoHtml.value.trim().replace(',', '.');
    const opcional = campo === 'cargaAlvo' || campo === 'descansoSegundos';
    const numero = texto === '' && opcional ? null : Number(texto);
    if (numero !== null && (texto === '' || Number.isNaN(numero))) {
      campoHtml.value = this.valorAtual(indice, campo);
      return;
    }
    this.atualizarItem(indice, item => definirCampo(item, campo, numero));
    // O [value] não reescreve o campo se o valor do item não mudou (ex.: 999 limitado a 100 de novo).
    campoHtml.value = this.valorAtual(indice, campo);
  }

  private valorAtual(indice: number, campo: CampoNumerico): string {
    const item = this.dia().exercicios[indice];
    const valor = campo === 'reps' ? item.repsMin : campo === 'etapas' ? (item.drops ?? 0) + 1 : item[campo];
    return valor === null ? '' : this.texto(valor);
  }

  protected texto(valor: number | null): string {
    return valor === null ? '' : String(valor).replace('.', ',');
  }

  // --- salvar / sair ---

  protected salvar(): void {
    if (!this.podeSalvar() || this.salvando()) return;
    const corpo: PlanoRequest = {
      nome: this.nome().trim(),
      objetivo: this.objetivo(),
      dias: this.dias().map(d => ({
        nome: d.nome.trim(),
        exercicios: d.exercicios.map(i => ({
          exercicioId: i.exercicioId,
          series: i.series,
          repsMin: i.repsMin,
          repsMax: i.repsMax,
          cargaAlvo: ehPesoCorporal(i) ? null : i.cargaAlvo,
          descansoSegundos: i.descansoSegundos,
          drops: ehPesoCorporal(i) ? 0 : i.drops ?? 0,
        })),
      })),
    };
    this.salvando.set(true);
    const requisicao = this.id ? this.api.atualizar(this.id, corpo) : this.api.criar(corpo);
    requisicao.subscribe({
      next: () => {
        this.aviso.open('Plano salvo.', undefined, { duration: 3000 });
        this.baseline = this.fotografar();
        this.roteador.navigate(['/planos']);
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  protected voltar(): void {
    this.roteador.navigate(['/planos']);
  }

  // --- internos ---

  /** Campo opcional: parte de vazio, sobe de passo em passo e volta a vazio ao chegar em zero. */
  private passo(atual: number | null, sinal: 1 | -1, passo: number, max: number): number | null {
    if (atual === null) return sinal > 0 ? passo : null;
    const proximo = Math.round((atual + sinal * passo) * 100) / 100;
    return proximo <= 0 ? null : Math.min(proximo, max);
  }

  private atualizarDia(indice: number, fn: (d: DiaPlano) => DiaPlano): void {
    this.dias.update(dias => dias.map((d, i) => (i === indice ? fn(d) : d)));
  }

  private atualizarItem(indice: number, fn: (i: ItemPlano) => ItemPlano): void {
    this.atualizarDia(this.diaAtivo(), d => ({
      ...d,
      exercicios: d.exercicios.map((item, i) => (i === indice ? fn(item) : item)),
    }));
  }

  private confirmar(titulo: string, mensagem: string, confirmar: string, acao: () => void): void {
    this.dialogo
      .open(ConfirmarDialogo, { panelClass: 'dialogo-confirmar', data: { titulo, mensagem, confirmar } })
      .afterClosed()
      .subscribe(ok => ok && acao());
  }
}
