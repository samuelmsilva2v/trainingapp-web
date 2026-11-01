import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Exercicio } from '../core/modelos';
import { MAX_DROPS, ehPesoCorporal, repsDoDrop } from '../core/series';
import { ConfigTroca } from '../core/troca';

export interface DadosTroca {
  exercicio: Exercicio;
  /** Reps iniciais da 1ª etapa se o drop-set for ligado (as mínimas do exercício original). */
  reps: number;
}

const REPS = { min: 1, max: 100 };

/** Folha "Trocar por": confirma a troca do exercício nesta sessão, como série normal ou como drop-set. */
@Component({
  selector: 'app-troca-exercicio',
  templateUrl: './troca-exercicio.html',
  styleUrl: './troca-exercicio.scss',
})
export class TrocaExercicio {
  protected readonly dados = inject<DadosTroca>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TrocaExercicio, ConfigTroca>);

  protected readonly pesoCorporal = ehPesoCorporal(this.dados.exercicio);
  protected readonly dropSet = signal(false);
  protected readonly reps = signal(this.dados.reps);
  /** Etapas contando a primeira (6 com 3 etapas = 6-8-10), como no editor de plano. */
  protected readonly etapas = signal(2);

  protected readonly sequencia = computed(() => {
    const lista = [this.reps()];
    for (let i = 1; i < this.etapas(); i++) lista.push(repsDoDrop(lista[i - 1]) ?? 1);
    return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1];
  });

  protected ajustarReps(sinal: 1 | -1): void {
    this.reps.update(r => Math.min(REPS.max, Math.max(REPS.min, r + sinal)));
  }

  protected ajustarEtapas(sinal: 1 | -1): void {
    this.etapas.update(e => Math.min(MAX_DROPS + 1, Math.max(2, e + sinal)));
  }

  protected confirmar(): void {
    this.ref.close(this.dropSet() ? { drops: this.etapas() - 1, reps: this.reps() } : { drops: 0, reps: this.dados.reps });
  }

  protected fechar(): void {
    this.ref.close();
  }
}
