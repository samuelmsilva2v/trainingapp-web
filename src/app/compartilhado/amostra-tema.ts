import { Component, computed, input } from '@angular/core';
import { Tema, coresDoTema, ehTemaClaro } from '../core/tema';

/**
 * Miniatura de um tema: o app em pequeno, nas cores e na fonte dele (tela de temas e Perfil). Compacta mostra só
 * o "Aa" e a faixa da cor primária. Só decoração: quem a usa diz o nome do tema.
 */
@Component({
  selector: 'app-amostra-tema',
  template: `
    <span class="aa">Aa</span>
    @if (!compacta()) {
      <span class="cartao-mini"><span class="titulo">Peito e Tríceps</span><span class="barra"><i></i></span><span class="botao">Iniciar treino</span></span>
    }
  `,
  host: { 'aria-hidden': 'true', '[class.compacta]': 'compacta()', '[style]': 'estilo()' },
  styles: `
    :host {
      position: relative; display: flex; flex-direction: column; aspect-ratio: 16 / 11; padding: 8px; overflow: hidden;
      border-radius: 10px; background: var(--a-fundo); color: var(--a-texto);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a-texto) 12%, transparent);
    }
    .aa { position: absolute; right: 8px; top: 5px; font: 800 22px/1 var(--a-titulo); color: var(--a-destaque); }
    .cartao-mini { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 6px 30px 6px 7px; border-radius: 7px; background: var(--a-sup); }
    .titulo { font: 700 13px/1 var(--a-titulo); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .barra { height: 4px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--a-texto) 14%, transparent); }
    .barra i { display: block; width: 62%; height: 100%; background: var(--a-destaque); }
    .botao { margin-top: auto; align-self: flex-start; padding: 3px 9px; border-radius: 6px; background: var(--a-primaria); color: var(--a-sobre); font: 700 9px/1.2 var(--a-titulo); }
    :host(.compacta) { padding: 5px; align-items: center; justify-content: center; }
    :host(.compacta) .aa { position: static; font-size: 20px; }
    :host(.compacta)::after { content: ''; position: absolute; left: 5px; right: 5px; bottom: 5px; height: 4px; border-radius: 4px; background: var(--a-primaria); }
  `,
})
export class AmostraTema {
  readonly tema = input.required<Tema>();
  readonly compacta = input(false);

  protected readonly estilo = computed(() => {
    const t = this.tema(), c = coresDoTema(t);
    return {
      'color-scheme': ehTemaClaro(t) ? 'light' : 'dark',
      '--a-fundo': c['--c-fundo'], '--a-sup': c['--c-sup-2'], '--a-texto': c['--c-texto'], '--a-primaria': c['--c-primaria'],
      '--a-sobre': c['--c-sobre-primaria'], '--a-destaque': c['--c-destaque'], '--a-titulo': c['--fonte-titulo'],
    };
  });
}
