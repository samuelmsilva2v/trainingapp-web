import { Component, computed, inject, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerfilApi } from '../../core/api';
import { GamificacaoStore } from '../../core/gamificacao-store';
import { NIVEL_DO_TEMA, ORDEM_DOS_TEMAS, Tema, gravandoTema, lerTema, proximoTema, salvarTema, temasLiberados, xpDoNivel } from '../../core/tema';
import { AmostraTema } from '../../compartilhado/amostra-tema';

/**
 * Tela de temas, aberta pelo Perfil (prévia aprovada em 2026-11-21): um card por tema, com a miniatura nas cores e
 * na fonte dele, na ordem de desbloqueio. Os bloqueados mostram o nível e o XP que falta; o próximo leva "PRÓXIMO".
 */
@Component({
  selector: 'app-temas',
  imports: [AmostraTema],
  templateUrl: './temas.html',
  styleUrl: './temas.scss',
})
export class TemasTela {
  private readonly roteador = inject(Router);
  private readonly api = inject(PerfilApi);
  private readonly aviso = inject(MatSnackBar);
  private readonly gamificacao = inject(GamificacaoStore);

  // Relê quando o nível chega: a GamificacaoStore pode ter voltado um tema travado ao padrão (conferirTema).
  protected readonly tema = linkedSignal<Tema>(() => (this.gamificacao.dados(), lerTema()));
  private readonly nivel = computed(() => this.gamificacao.dados()?.nivel ?? 0);
  private readonly xp = computed(() => this.gamificacao.dados()?.xpTotal ?? 0);
  protected readonly liberados = computed(() => temasLiberados(this.nivel()));
  protected readonly total = ORDEM_DOS_TEMAS.length;
  protected readonly cards = computed(() => {
    const proximo = proximoTema(this.nivel(), this.xp())?.tema;
    return ORDEM_DOS_TEMAS.map(({ tema, nome }) => {
      const minimo = NIVEL_DO_TEMA[tema] ?? 0;
      const travado = this.nivel() < minimo;
      return { tema, nome, travado, minimo, proximo: tema === proximo, faltam: travado ? Math.max(0, xpDoNivel(minimo) - this.xp()) : 0 };
    });
  });

  constructor() {
    // Aberta direto (sem passar pela casca), a gamificação ainda pode não ter chegado.
    if (!this.gamificacao.dados()) this.gamificacao.atualizar();
    // O roteador não restaura a rolagem: sem isto a tela abriria na altura em que o Perfil estava.
    window.scrollTo(0, 0);
  }

  protected escolher(card: { tema: Tema; travado: boolean; minimo: number }): void {
    if (card.travado) {
      this.aviso.open(`Chegue ao nível ${card.minimo} para liberar este tema.`, 'OK', { duration: 4000 });
      return;
    }
    if (card.tema === this.tema()) return;
    salvarTema(card.tema);
    this.tema.set(card.tema);
    gravandoTema(true);
    this.api.escolherTema(card.tema).subscribe({
      next: () => gravandoTema(false),
      error: () => {
        gravandoTema(false);
        this.aviso.open('Não deu para salvar o tema na conta: ele ficou só neste aparelho.', 'OK', { duration: 5000 });
      },
    });
  }

  protected formatar(n: number): string {
    return n.toLocaleString('pt-BR');
  }

  protected voltar(): void {
    void this.roteador.navigate(['/perfil']);
  }
}
