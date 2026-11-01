import { Component, computed, input } from '@angular/core';
import { criteriosDaSenha, forcaDaSenha } from '../core/senha';

/** Medidor de força da senha do Stitch: 4 barras, o que já foi atendido, o que falta e o rótulo (fraca, média, forte). */
@Component({
  selector: 'app-forca-senha',
  template: `
    <div class="barras" aria-hidden="true">
      @for (n of [1, 2, 3, 4]; track n) {
        <span [class.cheia]="n <= forca().nivel"></span>
      }
    </div>
    <div class="linha">
      <ul class="criterios" aria-label="Requisitos da senha">
        @for (c of criterios(); track c.rotulo) {
          <li [class.ok]="c.ok">
            <span class="icone" aria-hidden="true">{{ c.ok ? 'check_circle' : 'radio_button_unchecked' }}</span>
            {{ c.rotulo }}
            <span class="so-leitor">{{ c.ok ? '(atendido)' : '(falta)' }}</span>
          </li>
        }
      </ul>
      <span class="rotulo-forca" aria-live="polite">{{ forca().rotulo }}</span>
    </div>
  `,
  host: { '[attr.data-forca]': 'chave()' },
  styles: `
    :host { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
    .barras { display: flex; gap: 4px; height: 6px; }
    .barras span { flex: 1; border-radius: 9999px; background: var(--c-sup-4); transition: background 0.15s; }
    .linha { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .criterios { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; font: 600 11px/14px 'Inter', sans-serif; letter-spacing: 0.05em; color: var(--c-texto-2); }
    .criterios li { display: inline-flex; align-items: center; gap: 4px; transition: color 0.15s; }
    .criterios li.ok { color: var(--c-destaque); }
    .criterios .icone { font-size: 14px; }
    .rotulo-forca { flex-shrink: 0; font: 700 11px/14px 'Inter', sans-serif; letter-spacing: 0.05em; color: var(--c-texto-2); }
    .so-leitor { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    /* Cores do Stitch: fraca em laranja, média em laranja claro, forte em lima. */
    :host([data-forca='fraca']) .barras .cheia { background: var(--c-secundaria); }
    :host([data-forca='fraca']) .rotulo-forca { color: var(--c-secundaria-texto); }
    :host([data-forca='media']) .barras .cheia { background: var(--c-forca-media); }
    :host([data-forca='media']) .rotulo-forca { color: var(--c-forca-media); }
    :host([data-forca='forte']) .barras .cheia { background: var(--c-primaria); }
    :host([data-forca='forte']) .rotulo-forca { color: var(--c-destaque); }
  `,
})
export class ForcaSenha {
  readonly senha = input.required<string>();

  protected readonly criterios = computed(() => criteriosDaSenha(this.senha()));
  protected readonly forca = computed(() => forcaDaSenha(this.senha()));
  protected readonly chave = computed(() => ({ FRACA: 'fraca', MÉDIA: 'media', FORTE: 'forte' })[this.forca().rotulo]);
}
