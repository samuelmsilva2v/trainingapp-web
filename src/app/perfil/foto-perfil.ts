import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FotoTipo } from '../core/modelos';

export interface FotoPerfilDados {
  /** A foto mostrada agora (própria ou do Google); null = iniciais. */
  url: string | null;
  iniciais: string;
  tipo: FotoTipo;
}

/** O que a pessoa escolheu: um arquivo para enviar, remover a foto ou nada (Cancelar). */
export type EscolhaFoto = File | 'remover' | undefined;

/**
 * Folha "Foto do perfil" (web#60, Stitch "Perfil - Foto do Perfil Aberto"): galeria, câmera e remover. Só escolhe:
 * reduzir, enviar e confirmar a remoção ficam com o Perfil.
 */
@Component({
  selector: 'app-foto-perfil',
  template: `
    <div class="folha">
      <header class="cabecalho">
        <h2 class="titulo-sm">Foto do perfil</h2>
        <button type="button" class="btn-icone" aria-label="Fechar" (click)="ref.close()">
          <span class="icone" aria-hidden="true">close</span>
        </button>
      </header>

      <div class="previa">
        @if (dados.url && !quebrada()) {
          <img [src]="dados.url" alt="" referrerpolicy="no-referrer" (error)="quebrada.set(true)" />
        } @else {
          <span class="iniciais" aria-hidden="true">{{ dados.iniciais }}</span>
        }
      </div>

      <div class="opcoes">
        <label class="opcao">
          <span class="icone" aria-hidden="true">photo_library</span>
          <span>Escolher da galeria</span>
          <input type="file" accept="image/*" class="arquivo" (change)="escolher($event)" />
        </label>
        <label class="opcao">
          <span class="icone" aria-hidden="true">photo_camera</span>
          <span>Tirar foto</span>
          <input type="file" accept="image/*" capture="user" class="arquivo" (change)="escolher($event)" />
        </label>
        @if (dados.tipo !== 'PADRAO') {
          <button type="button" class="opcao perigo" (click)="ref.close('remover')">
            <span class="icone" aria-hidden="true">delete</span>
            <span>Remover foto</span>
          </button>
        }
      </div>

      <button type="button" class="btn btn-secundario" (click)="ref.close()">Cancelar</button>
    </div>
  `,
  styles: `
    .folha {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px 24px calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    }
    .cabecalho { display: flex; align-items: center; justify-content: space-between; }
    .previa {
      align-self: center;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--c-sup-3);
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .iniciais { color: var(--c-destaque); font: 800 36px/1 var(--fonte-titulo); }
    .opcoes { display: flex; flex-direction: column; gap: 8px; }
    .opcao {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 0 16px;
      border: 0;
      border-radius: var(--r-md);
      background: var(--c-sup-3);
      color: var(--c-texto);
      font: 600 16px/24px 'Inter', sans-serif;
      text-align: left;
      cursor: pointer;
      .icone { color: var(--c-destaque); }
      &:focus-within { outline: 2px solid var(--c-destaque); }
    }
    .perigo, .perigo .icone { color: var(--c-erro); }
    /* O input cobre a opção inteira, invisível: o toque abre o seletor do sistema e o leitor de tela anuncia o rótulo. */
    .arquivo { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  `,
})
export class FotoPerfil {
  protected readonly dados = inject<FotoPerfilDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<FotoPerfil, EscolhaFoto>);
  protected readonly quebrada = signal(false);

  protected escolher(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (arquivo) this.ref.close(arquivo);
  }
}
