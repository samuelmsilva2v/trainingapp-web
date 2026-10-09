import { Injectable, computed, inject, signal } from '@angular/core';
import { GamificacaoApi } from './api';
import { Gamificacao } from './modelos';

/** Situação de gamificação compartilhada pelo cabeçalho, Hoje e Perfil. */
@Injectable({ providedIn: 'root' })
export class GamificacaoStore {
  private readonly api = inject(GamificacaoApi);

  readonly dados = signal<Gamificacao | null>(null);
  readonly erro = signal(false);

  /** Fração (0–1) já percorrida no nível atual. */
  readonly progresso = computed(() => {
    const g = this.dados();
    if (!g) return 0;
    const faixa = g.xpProximoNivel - g.xpInicioDoNivel;
    return faixa > 0 ? Math.min(1, Math.max(0, (g.xpTotal - g.xpInicioDoNivel) / faixa)) : 0;
  });

  /** XP que falta para o próximo nível. */
  readonly xpFaltante = computed(() => {
    const g = this.dados();
    return g ? Math.max(0, g.xpProximoNivel - g.xpTotal) : 0;
  });

  atualizar(): void {
    this.api.resumo().subscribe({
      next: dados => {
        this.dados.set(dados);
        this.erro.set(false);
      },
      error: () => this.erro.set(true),
    });
  }
}
