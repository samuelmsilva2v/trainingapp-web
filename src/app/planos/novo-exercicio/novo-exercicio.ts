import { Component, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ExerciciosApi, mensagemDeErro } from '../../core/api';
import { Equipamento, Exercicio, GrupoMuscular } from '../../core/modelos';
import { EQUIPAMENTOS, GRUPOS } from '../../core/rotulos';

const NOME_MAX = 150;

/** Folha "Novo exercício": cria um exercício próprio e fecha devolvendo o exercício criado. */
@Component({
  selector: 'app-novo-exercicio',
  templateUrl: './novo-exercicio.html',
  styleUrl: './novo-exercicio.scss',
})
export class NovoExercicio {
  private readonly api = inject(ExerciciosApi);
  private readonly ref = inject(MatDialogRef<NovoExercicio, Exercicio>);

  protected readonly grupos = GRUPOS;
  protected readonly equipamentos = EQUIPAMENTOS;
  protected readonly nomeMax = NOME_MAX;

  protected readonly nome = signal('');
  protected readonly grupo = signal<GrupoMuscular | null>(null);
  protected readonly equipamento = signal<Equipamento | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly podeSalvar = computed(() => {
    const tamanho = this.nome().trim().length;
    return tamanho > 0 && tamanho <= NOME_MAX && this.grupo() !== null && this.equipamento() !== null;
  });

  protected escolher<T extends string>(alvo: { set(v: T | null): void }, evento: Event): void {
    alvo.set(((evento.target as HTMLSelectElement).value as T) || null);
  }

  protected enviar(evento: Event): void {
    evento.preventDefault(); // Enter no campo de nome envia o formulário
    const grupoMuscular = this.grupo();
    const equipamento = this.equipamento();
    if (!this.podeSalvar() || this.salvando() || !grupoMuscular || !equipamento) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.api.criar({ nome: this.nome().trim(), grupoMuscular, equipamento }).subscribe({
      next: exercicio => this.ref.close(exercicio),
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.salvando.set(false);
      },
    });
  }

  protected fechar(): void {
    this.ref.close();
  }
}
