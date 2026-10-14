import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmarDados {
  titulo: string;
  mensagem: string;
  confirmar: string;
  /** Texto do botão que fecha sem confirmar (padrão "Cancelar"). */
  cancelar?: string;
  /** Confirmar sem ser uma ação destrutiva: botão na cor primária, não no vermelho de perigo. */
  primario?: boolean;
}

@Component({
  selector: 'app-confirmar-dialogo',
  template: `
    <div class="corpo">
      <h2 class="titulo-sm">{{ dados.titulo }}</h2>
      <p class="suave">{{ dados.mensagem }}</p>
      <div class="acoes">
        <button type="button" class="btn btn-secundario" (click)="ref.close(false)">{{ dados.cancelar ?? 'Cancelar' }}</button>
        <button type="button" class="btn" [class.btn-perigo]="!dados.primario" [class.btn-primario]="dados.primario"
                (click)="ref.close(true)">{{ dados.confirmar }}</button>
      </div>
    </div>
  `,
  styles: `
    .corpo { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    .acoes { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `,
})
export class ConfirmarDialogo {
  protected readonly dados = inject<ConfirmarDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ConfirmarDialogo, boolean>);
}
