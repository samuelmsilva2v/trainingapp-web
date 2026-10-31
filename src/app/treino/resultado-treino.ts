import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { linhasComRecorde, seriesFeitas, xpDoTreino } from '../core/series';
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
  protected readonly xpTreino = xpDoTreino(this.sessao);
  protected readonly bonus = this.sessao.xpStreak ?? 0;
  /** A sequência que este treino acabou de estender. */
  protected readonly diasSequencia = this.dados.depois?.streakAtual ?? 0;
  protected readonly feitas = this.sessao.exercicios.reduce((n, e) => n + seriesFeitas(e), 0);
  protected readonly planejadas = this.sessao.exercicios.reduce((n, e) => n + e.metaSeries, 0);

  protected readonly seriesFeitas = seriesFeitas;

  /** Largura (0-1) da barra de nível; começa no "antes" e anima até o "depois". */
  protected readonly largura = signal(0);

  protected readonly subiu = (this.dados.depois?.nivel ?? 0) > (this.dados.antes?.nivel ?? 0);
  /** O título mudou com este treino (ex.: de Iniciante para Dedicado); sem o "antes" não dá para saber. */
  protected readonly tituloNovo =
    this.dados.antes?.titulo && this.dados.depois?.titulo && this.dados.antes.titulo !== this.dados.depois.titulo
      ? this.dados.depois.titulo
      : null;
  protected readonly faltam = this.dados.depois
    ? Math.max(0, this.dados.depois.xpProximoNivel - this.dados.depois.xpTotal)
    : 0;

  /** Exercícios com o XP de cada um; o recorde (🏆) marca só a primeira vez que o exercício aparece. */
  protected readonly itens = this.sessao.exercicios.map(e => ({ e, recorde: linhasComRecorde(this.sessao).has(e.id) }));

  protected readonly recordes = (this.sessao.recordes ?? [])
    .map(id => this.sessao.exercicios.find(e => e.exercicioId === id)?.nome)
    .filter((nome): nome is string => !!nome);

  /** Conquistas creditadas neste treino, como a API as gravou (inclui as que já valiam antes, no 1º treino depois do deploy). */
  protected readonly conquistasNovas = this.sessao.conquistas ?? [];
  protected readonly xpConquistas = this.sessao.xpConquistas ?? 0;
  /** Desafios da semana cumpridos com este treino. */
  protected readonly desafios = this.sessao.desafios ?? [];
  protected readonly xpDesafios = this.sessao.xpDesafios ?? 0;

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
