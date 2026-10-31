import { Component, computed, effect, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { Network } from '@capacitor/network';
import { AuthStore } from '../core/auth';
import { Falha, TEXTOS_FALHA } from '../core/falha';

/** Nova tentativa automática de "Servidor indisponível" e "Servidor demorando". */
export const NOVA_TENTATIVA_MS = 10_000;

/**
 * Tela de quando não deu para carregar (na abertura do app ou numa tela): ícone, título, uma frase e a ação do tipo.
 * Sem internet tenta de novo quando a rede volta; servidor fora ou lento, a cada 10 s; os outros só pelo botão.
 */
@Component({
  selector: 'app-tela-erro',
  template: `
    <span class="icone" aria-hidden="true">{{ texto().icone }}</span>
    <h2 class="titulo-sm">{{ texto().titulo }}</h2>
    <p class="suave">{{ texto().frase }}</p>
    @if (falha().tipo === 'inesperado' && falha().codigo) {
      <p class="codigo num">Código {{ falha().codigo }}</p>
    }
    <button type="button" class="btn btn-primario" (click)="agir()">{{ texto().botao }}</button>
  `,
  host: { role: 'alert', '[class.cheia]': 'cheia()', '[attr.data-tipo]': 'falha().tipo' },
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 16px; text-align: center; }
    :host(.cheia) { min-height: 100dvh; justify-content: center; box-sizing: border-box; }
    .icone { font-size: 56px; color: var(--c-texto-2); }
    :host([data-tipo='inesperado']) .icone, :host([data-tipo='restrito']) .icone { color: var(--c-secundaria); }
    h2, p { margin: 0; }
    .suave { max-width: 320px; }
    .codigo { font: 600 11px/14px 'Inter', sans-serif; color: var(--c-texto-2); letter-spacing: 0.05em; }
    .btn { margin-top: 8px; min-width: 200px; }
  `,
})
export class TelaErro {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  readonly falha = input.required<Falha>();
  /** Ocupa a altura toda (abertura do app, sem a casca). */
  readonly cheia = input(false);
  /** Pedido de nova tentativa: pelo botão ou automático. */
  readonly tentar = output<void>();

  protected readonly texto = computed(() => TEXTOS_FALHA[this.falha().tipo]);

  constructor() {
    effect(onCleanup => {
      const tipo = this.falha().tipo;
      if (tipo === 'indisponivel' || tipo === 'demorando') {
        const id = setInterval(() => this.tentar.emit(), NOVA_TENTATIVA_MS);
        onCleanup(() => clearInterval(id));
      } else if (tipo === 'sem-internet') {
        // O evento 'online' do navegador não dispara no WebView do Android; o plugin ouve a conectividade do aparelho.
        const voltou = () => this.tentar.emit();
        addEventListener('online', voltou);
        const ouvinte = Network.addListener('networkStatusChange', s => s.connected && voltou());
        onCleanup(() => {
          removeEventListener('online', voltou);
          void ouvinte.then(o => o.remove());
        });
      }
    });
  }

  protected agir(): void {
    switch (this.falha().tipo) {
      case 'restrito':
        this.auth.sair().subscribe();
        break;
      case 'nao-encontrada':
        void this.router.navigateByUrl('/hoje');
        break;
      default:
        this.tentar.emit();
    }
  }
}

/** Rota inexistente (dentro da casca, com as abas). */
@Component({
  selector: 'app-pagina-nao-encontrada',
  imports: [TelaErro],
  template: `<app-tela-erro [falha]="falha" />`,
})
export class PaginaNaoEncontrada {
  protected readonly falha: Falha = { tipo: 'nao-encontrada', codigo: null };
}
