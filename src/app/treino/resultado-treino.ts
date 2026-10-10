import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { melhorSerie, seriesFeitas, volumeTotal } from '../core/series';
import { formatarCarga, formatarKg } from '../core/formatos';
import { Gamificacao, SessaoLocal } from '../core/modelos';

export interface ResultadoDados {
  sessao: SessaoLocal;
  antes: Gamificacao | null;
  depois: Gamificacao | null;
}

const MINIMO_SERIES_XP = 3;

/** Tela de resultado ao concluir: XP, nível, recordes, sequência, conquistas e o resumo do treino. */
@Component({
  selector: 'app-resultado-treino',
  templateUrl: './resultado-treino.html',
  styleUrl: './resultado-treino.scss',
})
export class ResultadoTreino implements OnInit {
  protected readonly dados = inject<ResultadoDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ResultadoTreino>);

  protected readonly sessao = this.dados.sessao;
  protected readonly xp = this.sessao.xpGanho ?? 0;
  protected readonly volume = volumeTotal(this.sessao);
  protected readonly feitas = this.sessao.exercicios.reduce((n, e) => n + seriesFeitas(e), 0);
  protected readonly planejadas = this.sessao.exercicios.reduce((n, e) => n + e.metaSeries, 0);

  protected readonly formatarCarga = formatarCarga;
  protected readonly formatarKg = formatarKg;
  protected readonly seriesFeitas = seriesFeitas;
  protected readonly melhorSerie = melhorSerie;

  /** Largura (0-1) da barra de nível; começa no "antes" e anima até o "depois". */
  protected readonly largura = signal(0);

  protected readonly subiu = (this.dados.depois?.nivel ?? 0) > (this.dados.antes?.nivel ?? 0);
  protected readonly faltam = this.dados.depois
    ? Math.max(0, this.dados.depois.xpProximoNivel - this.dados.depois.xpTotal)
    : 0;

  protected readonly recordes = (this.sessao.recordes ?? [])
    .map(id => this.sessao.exercicios.find(e => e.exercicioId === id)?.nome)
    .filter((nome): nome is string => !!nome);

  protected readonly conquistasNovas = (this.dados.depois?.conquistas ?? []).filter(
    c => c.conquistada && !this.dados.antes?.conquistas.some(a => a.codigo === c.codigo && a.conquistada),
  );

  /** Por que o treino não rendeu XP. */
  protected readonly motivoSemXp =
    this.feitas < MINIMO_SERIES_XP
      ? `Treinos com menos de ${MINIMO_SERIES_XP} séries concluídas não rendem XP.`
      : 'Só o primeiro treino do dia rende XP.';

  ngOnInit(): void {
    this.largura.set(this.subiu ? 0 : this.fracao(this.dados.antes));
    // Depois da primeira pintura, para a transição da barra rodar.
    setTimeout(() => this.largura.set(this.fracao(this.dados.depois)), 50);
  }

  private fracao(g: Gamificacao | null): number {
    if (!g) return 0;
    const faixa = g.xpProximoNivel - g.xpInicioDoNivel;
    return faixa > 0 ? Math.min(1, Math.max(0, (g.xpTotal - g.xpInicioDoNivel) / faixa)) : 0;
  }
}
