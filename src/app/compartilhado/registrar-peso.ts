import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PesoApi, mensagemDeErro } from '../core/api';
import { Peso } from '../core/modelos';
import { hojeIso } from '../core/peso';

export interface RegistrarPesoDados {
  /** Pesagens já feitas: o peso começa no último e avisa quando a data escolhida já tem um. */
  pesos: readonly Peso[];
}

/** Folha "Registrar peso": grava a pesagem do dia escolhido e fecha devolvendo o registro salvo. */
@Component({
  selector: 'app-registrar-peso',
  template: `
    <form class="folha" (submit)="enviar($event)">
      <header class="cabecalho">
        <h2 class="titulo-sm"><span class="icone" aria-hidden="true">scale</span> Registrar peso</h2>
        <button type="button" class="btn-icone" aria-label="Fechar" (click)="ref.close()">
          <span class="icone" aria-hidden="true">close</span>
        </button>
      </header>

      <label class="campo">
        <span class="rotulo suave">Peso (kg)</span>
        <input type="text" inputmode="decimal" cdkFocusInitial autocomplete="off" class="num" placeholder="Ex.: 78,4"
               [value]="texto()" (input)="texto.set($any($event.target).value)" />
      </label>

      <label class="campo">
        <span class="rotulo suave">Data</span>
        <input type="date" required [max]="hoje" [value]="data()" (change)="data.set($any($event.target).value)" />
      </label>

      <p class="suave dica">De manhã, em jejum, depois do banheiro: assim as pesagens se comparam.</p>
      @if (substitui()) {
        <p class="suave dica" role="status">Já há uma pesagem nesse dia; ela será substituída.</p>
      }
      @if (erro()) {
        <p class="erro" role="alert">{{ erro() }}</p>
      }

      <div class="acoes">
        <button type="button" class="btn btn-secundario" (click)="ref.close()">Cancelar</button>
        <button type="submit" class="btn btn-primario" [disabled]="kg() === null || salvando()">
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .folha {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px 24px calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    }
    .cabecalho { display: flex; align-items: center; justify-content: space-between; }
    .cabecalho .titulo-sm { display: flex; align-items: center; gap: 8px; }
    .cabecalho .titulo-sm .icone { color: var(--c-primaria); }
    .campo { display: flex; flex-direction: column; gap: 4px; }
    input {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 0;
      border-radius: var(--r-sm);
      background: var(--c-sup-0);
      color: var(--c-texto);
      font: 400 16px/24px 'Inter', sans-serif;
      color-scheme: dark;
    }
    input:focus { outline: 2px solid var(--c-primaria); background: var(--c-sup-3); }
    input::placeholder { color: var(--c-texto-2); opacity: 0.6; }
    .dica { font-size: 12px; line-height: 16px; }
    .erro { color: var(--c-erro); }
    .acoes { display: flex; gap: 8px; margin-top: 8px; }
    .acoes .btn { flex: 1; }
  `,
})
export class RegistrarPeso {
  private readonly api = inject(PesoApi);
  private readonly dados = inject<RegistrarPesoDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RegistrarPeso, Peso>);

  protected readonly hoje = hojeIso();
  protected readonly data = signal(this.hoje);
  protected readonly texto = signal(this.dados.pesos.at(-1)?.kg.toLocaleString('pt-BR') ?? '');
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  /** Peso válido (20 a 400 kg, até 2 casas, como a API aceita) ou null. */
  protected readonly kg = computed(() => {
    const texto = this.texto().trim().replace(',', '.');
    const valor = Number(texto);
    return texto && /^\d+(\.\d{1,2})?$/.test(texto) && valor >= 20 && valor <= 400 ? valor : null;
  });
  protected readonly substitui = computed(() => this.dados.pesos.some(p => p.data === this.data()));

  protected enviar(evento: Event): void {
    evento.preventDefault();
    const kg = this.kg();
    const data = this.data();
    if (kg === null || !data || data > this.hoje || this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.api.registrar(data, kg).subscribe({
      next: peso => this.ref.close(peso),
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.salvando.set(false);
      },
    });
  }
}
