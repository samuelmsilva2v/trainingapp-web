import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatDialogRef } from '@angular/material/dialog';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ExerciciosApi, mensagemDeErro } from '../../core/api';
import { Equipamento, Exercicio, GrupoMuscular } from '../../core/modelos';
import { EQUIPAMENTOS, GRUPOS, rotuloEquipamento, rotuloGrupo } from '../../core/rotulos';

const LIMITE_EXIBIDO = 100;

@Component({
  selector: 'app-seletor-exercicio',
  templateUrl: './seletor-exercicio.html',
  styleUrl: './seletor-exercicio.scss',
})
export class SeletorExercicio {
  private readonly api = inject(ExerciciosApi);
  private readonly ref = inject(MatDialogRef<SeletorExercicio, Exercicio>);

  protected readonly grupos = GRUPOS;
  protected readonly equipamentos = EQUIPAMENTOS;
  protected readonly rotuloGrupo = rotuloGrupo;
  protected readonly rotuloEquipamento = rotuloEquipamento;

  protected readonly busca = signal('');
  protected readonly grupo = signal<GrupoMuscular | null>(null);
  protected readonly equipamento = signal<Equipamento | null>(null);
  protected readonly apenasMeus = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly carregando = signal(true);

  // Busca e grupo vão para a API (a busca ignora acento e caixa); equipamento e "meus" filtram em memória.
  private readonly resultado = toSignal(
    toObservable(computed(() => ({ busca: this.busca(), grupo: this.grupo() }))).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => a.busca === b.busca && a.grupo === b.grupo),
      switchMap(({ busca, grupo }) => {
        this.carregando.set(true);
        this.erro.set(null);
        return this.api.listar(grupo, busca).pipe(
          catchError(e => {
            this.erro.set(mensagemDeErro(e));
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

  protected escolher(exercicio: Exercicio): void {
    this.ref.close(exercicio);
  }

  protected fechar(): void {
    this.ref.close();
  }
}
