import { Component, input, signal } from '@angular/core';
import { NO_APP } from '../core/cofre';
import { PASSOS_CARGA, PassoCarga, lerPassoCarga, salvarPassoCarga } from '../core/carga';
import { kg } from '../core/formatos';
import { salvarNoPlanoLigado, salvarSalvarNoPlano } from '../core/plano-da-sessao';
import { ConfigLembrete, lerLembrete, salvarLembrete } from '../core/lembrete';
import { avisoDescansoLigado, salvarAvisoDescanso } from '../core/android';

/** Opções de treino, todas guardadas no aparelho (sem API): na tela de Configurações e na folha do treino em andamento. */
@Component({
  selector: 'app-opcoes-treino',
  templateUrl: './opcoes-treino.html',
  styleUrl: './opcoes-treino.scss',
})
export class OpcoesTreino {
  /** O lembrete de treino (horário e dias) não muda nada no treino em andamento: só na tela de Configurações. */
  readonly comLembrete = input(false);
  protected readonly noApp = NO_APP;
  protected readonly kg = kg;
  protected readonly passos = PASSOS_CARGA;
  protected readonly passo = signal<PassoCarga>(lerPassoCarga());
  protected readonly salvarNoPlano = signal(salvarNoPlanoLigado());
  protected readonly lembrete = signal<ConfigLembrete>(lerLembrete());
  protected readonly avisoDescanso = signal(avisoDescansoLigado());
  protected readonly diasDaSemana = [
    { valor: 0, letra: 'D', nome: 'Domingo' },
    { valor: 1, letra: 'S', nome: 'Segunda' },
    { valor: 2, letra: 'T', nome: 'Terça' },
    { valor: 3, letra: 'Q', nome: 'Quarta' },
    { valor: 4, letra: 'Q', nome: 'Quinta' },
    { valor: 5, letra: 'S', nome: 'Sexta' },
    { valor: 6, letra: 'S', nome: 'Sábado' },
  ];

  protected mudarPasso(passo: PassoCarga): void {
    this.passo.set(passo);
    salvarPassoCarga(passo);
  }

  protected alternarSalvarNoPlano(): void {
    this.salvarNoPlano.update(ligado => !ligado);
    salvarSalvarNoPlano(this.salvarNoPlano());
  }

  /** Aviso de fim do descanso: desligar cancela o aviso já agendado. */
  protected alternarAvisoDescanso(): void {
    this.avisoDescanso.update(ligado => !ligado);
    salvarAvisoDescanso(this.avisoDescanso());
  }

  /** Lembrete de treino: reagendado a cada mudança. */
  protected alterarLembrete(mudanca: Partial<ConfigLembrete>): void {
    this.lembrete.update(atual => ({ ...atual, ...mudanca }));
    void salvarLembrete(this.lembrete());
  }

  protected mudarHora(hora: string): void {
    if (/^\d{2}:\d{2}$/.test(hora)) this.alterarLembrete({ hora });
  }

  protected alternarDia(dia: number): void {
    const dias = this.lembrete().dias;
    this.alterarLembrete({ dias: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia].sort() });
  }
}
