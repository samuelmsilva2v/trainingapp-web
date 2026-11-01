import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ExerciciosApi } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { TelaErro } from '../../compartilhado/tela-erro';
import { verFotos } from '../../compartilhado/ver-fotos';
import { Carregando } from '../../compartilhado/carregando';
import { Equipamento, Exercicio, GrupoMuscular } from '../../core/modelos';
import { EQUIPAMENTOS, GRUPOS, rotuloEquipamento, rotuloGrupo } from '../../core/rotulos';

const LIMITE_EXIBIDO = 100;

/** Filtro inicial opcional (ex.: trocar exercício no treino abre no grupo muscular do original). */
export interface DadosSeletor {
  grupo?: GrupoMuscular;
}

@Component({
  selector: 'app-seletor-exercicio',
  imports: [TelaErro, Carregando],
  templateUrl: './seletor-exercicio.html',
  styleUrl: './seletor-exercicio.scss',
})
export class SeletorExercicio {
  private readonly api = inject(ExerciciosApi);
  private readonly ref = inject(MatDialogRef<SeletorExercicio, Exercicio>);
  private readonly dialogo = inject(MatDialog);
  private readonly dados = inject<DadosSeletor | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly grupos = GRUPOS;
  protected readonly equipamentos = EQUIPAMENTOS;
  protected readonly rotuloGrupo = rotuloGrupo;
  protected readonly rotuloEquipamento = rotuloEquipamento;

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
    this.ref.close(exercicio);
  }

  protected fechar(): void {
    this.ref.close();
  }
}
