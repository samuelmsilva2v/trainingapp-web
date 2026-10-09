import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-em-breve',
  template: `
    <section class="vazio">
      <span class="icone" aria-hidden="true">construction</span>
      <h2 class="titulo-sm">{{ titulo }}</h2>
      <p class="suave">Esta tela chega nas próximas fases.</p>
    </section>
  `,
  styles: `
    .vazio { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 64px 16px; text-align: center; }
    .icone { font-size: 48px; color: var(--c-texto-2); }
  `,
})
export class EmBreve {
  protected readonly titulo = inject(ActivatedRoute).snapshot.data['titulo'] as string;
}
