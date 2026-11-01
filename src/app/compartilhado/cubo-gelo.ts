import { Component } from '@angular/core';

/** Ícone do congelamento de sequência: o Material Symbols não tem cubo de gelo. Segue o font-size e a cor como os ícones. */
@Component({
  selector: 'app-cubo-gelo',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <path d="M12 3.2 19.6 7.4 12 11.6 4.4 7.4Z" />
      <path d="M4.4 7.4v9.2L12 20.8V11.6" />
      <path d="M19.6 7.4v9.2L12 20.8" />
      <path d="M7.2 11.4v3.2" />
    </svg>
  `,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host { display: inline-flex; width: 1em; height: 1em; flex-shrink: 0; }
    svg { width: 100%; height: 100%; }
  `,
})
export class CuboGelo {}
