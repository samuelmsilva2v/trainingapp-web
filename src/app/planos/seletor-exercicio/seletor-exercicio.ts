import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ExerciciosApi } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { TelaErro } from '../../compartilhado/tela-erro';
import { verFotos } from '../../compartilhado/ver-fotos';
import { ConfirmarDados, ConfirmarDialogo } from '../../compartilhado/confirmar-dialogo';
import { Carregando } from '../../compartilhado/carregando';
import { Equipamento, Exercicio, GrupoMuscular } from '../../core/modelos';
import { EQUIPAMENTOS, GRUPOS, rotuloEquipamento, rotuloGrupo } from '../../core/rotulos';

const LIMITE_EXIBIDO = 100;

/** Filtro inicial opcional (ex.: trocar exercício no treino abre no grupo muscular do original). */
export interface DadosSeletor {
  grupo?: GrupoMuscular;
  /** Marca vários e devolve a lista no "Adicionar (N)", na ordem dos toques (editor de plano, web#70). */
  multiplo?: boolean;
  /** Exercícios que já estão no dia aberto: marcar um deles pede confirmação. */
  noDia?: string[];
}

@Component({
  selector: 'app-seletor-exercicio',
  imports: [TelaErro, Carregando],
  templateUrl: './seletor-exercicio.html',
  styleUrl: './seletor-exercicio.scss',
})
export class SeletorExercicio {
  private readonly api = inject(ExerciciosApi);
  private readonly ref = inject(MatDialogRef<SeletorExercicio, Exercicio | Exercicio[]>);
  private readonly dialogo = inject(MatDialog);
  private readonly dados = inject<DadosSeletor | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly grupos = GRUPOS;
  protected readonly equipamentos = EQUIPAMENTOS;
  protected readonly rotuloGrupo = rotuloGrupo;
  protected readonly rotuloEquipamento = rotuloEquipamento;
  protected readonly multiplo = !!this.dados?.multiplo;
  /** Os marcados, na ordem dos toques; sobrevivem a busca e filtros. */
  protected readonly marcados = signal<Exercicio[]>([]);
  protected readonly marcadosIds = computed(() => new Set(this.marcados().map(e => e.id)));

  constructor() {
    if (!this.multiplo) return;
    // Esc passa pelo fechar(), que confirma o descarte da seleção.
    this.ref.disableClose = true;
    this.ref.keydownEvents().subscribe(evento => {
      if (evento.key === 'Escape') this.fechar();
    });
  }

  protected readonly busca = signal('');
  protected readonly grupo = signal<GrupoMuscular | null>(this.dados?.grupo ?? null);
  protected readonly equipamento = signal<Equipamento | null>(null);
  protected readonly apenasMeus = signal(false);
  protected readonly erro = signal<Falha | null>(null);
  protected readonly carregando = signal(true);
  /** "Tentar de novo" da tela de erro: muda para refazer a mesma busca. */
  protected readonly tentativa = signal(0);

  // Busca e grupo vão para a API (a busca ignora acento e caixa); equipamento e "meus" filtram em memória.
  private readonly resultado = toSignal(
    toObservable(computed(() => ({ busca: this.busca(), grupo: this.grupo(), tentativa: this.tentativa() }))).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => a.busca === b.busca && a.grupo === b.grupo && a.tentativa === b.tentativa),
      switchMap(({ busca, grupo }) => {
        this.carregando.set(true);
        this.erro.set(null);
        return this.api.listar(grupo, busca).pipe(
          catchError(e => {
            this.erro.set(falhaDe(e));
            return of<Exercicio[]>([]);
          }),
          tap(() => this.carregando.set(false)),
        );
      }),
    ),
    { initialValue: [] as Exercicio[] },
  );

  protected readonly filtrados = computed(() => {
    const eq = this.equipamento();
    const meus = this.apenasMeus();
    return this.resultado().filter(e => (!eq || e.equipamento === eq) && (!meus || e.personalizado));
  });
  protected readonly exibidos = computed(() => this.filtrados().slice(0, LIMITE_EXIBIDO));
  protected readonly excedente = computed(() => Math.max(0, this.filtrados().length - LIMITE_EXIBIDO));

  protected digitar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected escolherEquipamento(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.equipamento.set(valor ? (valor as Equipamento) : null);
  }

  protected ampliarFoto(exercicio: Exercicio): void {
    verFotos(this.dialogo, { nome: exercicio.nome, fotos: exercicio.imagens, indice: 0 });
  }

  /** Miniatura que não carregou (404 do dataset): fica o ícone e o toque nela não abre nada. */
  protected semFoto(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    (img.parentElement as HTMLButtonElement).disabled = true;
    img.remove();
  }

  protected escolher(exercicio: Exercicio): void {
    if (!this.multiplo) {
      this.ref.close(exercicio);
      return;
    }
    if (this.marcadosIds().has(exercicio.id)) {
      this.marcados.update(lista => lista.filter(e => e.id !== exercicio.id));
      return;
    }
    const marcar = () => this.marcados.update(lista => [...lista, exercicio]);
    if (!this.dados?.noDia?.includes(exercicio.id)) {
      marcar();
      return;
    }
    this.confirmar(
      { titulo: 'Exercício repetido', mensagem: `${exercicio.nome} já está neste dia. Marcar de novo?`, confirmar: 'Marcar', primario: true },
      marcar,
    );
  }

  protected adicionar(): void {
    this.ref.close(this.marcados());
  }

  /** Voltar do Android (core/android.ts): mesma regra do X. */
  aoVoltar(): void {
    this.fechar();
  }

  /** X e Esc: com algo marcado, pergunta antes de descartar. */
  protected fechar(): void {
    const n = this.marcados().length;
    if (n === 0) {
      this.ref.close();
      return;
    }
    const mensagem = n === 1 ? 'O exercício marcado não será adicionado.' : `Os ${n} exercícios marcados não serão adicionados.`;
    this.confirmar({ titulo: 'Descartar seleção', mensagem, confirmar: 'Descartar' }, () => this.ref.close());
  }

  private confirmar(dados: ConfirmarDados, acao: () => void): void {
    this.dialogo
      .open(ConfirmarDialogo, { panelClass: 'dialogo-confirmar', data: dados })
      .afterClosed()
      .subscribe(ok => ok && acao());
  }
}
