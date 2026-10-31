import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { PlanosApi, mensagemDeErro } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { TelaErro } from '../../compartilhado/tela-erro';
import { DiaPlano, Plano, PlanoResumo } from '../../core/modelos';
import { rotuloObjetivo } from '../../core/rotulos';
import { ConfirmarDialogo } from '../../compartilhado/confirmar-dialogo';

@Component({
  selector: 'app-planos-lista',
  imports: [RouterLink, TelaErro],
  templateUrl: './planos-lista.html',
  styleUrl: './planos-lista.scss',
})
export class PlanosLista implements OnInit {
  private readonly api = inject(PlanosApi);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly planos = signal<PlanoResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<Falha | null>(null);
  protected readonly rotuloObjetivo = rotuloObjetivo;
  protected readonly abertos = signal<ReadonlySet<string>>(new Set());
  protected readonly detalhes = signal<ReadonlyMap<string, Plano>>(new Map());
  protected readonly erroResumo = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.listar().subscribe({
      next: planos => {
        this.planos.set(planos);
        this.carregando.set(false);
        // O plano ativo já abre com o resumo da rotina visível.
        const ativo = planos.find(p => p.ativo);
        if (ativo && !this.abertos().has(ativo.id)) this.alternar(ativo);
      },
      error: e => {
        this.erro.set(falhaDe(e));
        this.carregando.set(false);
      },
    });
  }

  /** Abre ou fecha o resumo da rotina; os dias e exercícios vêm do detalhe do plano, buscado na primeira abertura. */
  protected alternar(plano: PlanoResumo): void {
    const abertos = new Set(this.abertos());
    if (abertos.delete(plano.id)) {
      this.abertos.set(abertos);
      return;
    }
    abertos.add(plano.id);
    this.abertos.set(abertos);
    this.erroResumo.set(null);
    if (this.detalhes().has(plano.id)) return;
    this.api.obter(plano.id).subscribe({
      next: detalhe => this.detalhes.update(m => new Map(m).set(plano.id, detalhe)),
      error: e => this.erroResumo.set(mensagemDeErro(e)),
    });
  }

  protected letras(quantidade: number): string {
    return Array.from({ length: Math.min(quantidade, 26) }, (_, i) => String.fromCharCode(65 + i)).join('');
  }

  protected totalSeries(dia: DiaPlano): number {
    return dia.exercicios.reduce((total, e) => total + e.series, 0);
  }

  protected nomesDosExercicios(dia: DiaPlano): string {
    return dia.exercicios.map(e => e.exercicioNome).join(', ');
  }

  protected ativar(plano: PlanoResumo): void {
    this.api.ativar(plano.id).subscribe({
      next: () => {
        this.aviso.open(`"${plano.nome}" agora é o plano ativo.`, undefined, { duration: 3000 });
        this.carregar();
      },
      error: e => this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 }),
    });
  }

  protected excluir(plano: PlanoResumo): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        panelClass: 'dialogo-confirmar',
        data: {
          titulo: 'Excluir plano',
          mensagem: `"${plano.nome}" será removido. Essa ação não pode ser desfeita.`,
          confirmar: 'Excluir',
        },
      })
      .afterClosed()
      .subscribe(confirmou => {
        if (!confirmou) return;
        this.api.excluir(plano.id).subscribe({
          next: () => {
            this.aviso.open('Plano excluído.', undefined, { duration: 3000 });
            this.carregar();
          },
          error: e => this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 }),
        });
      });
  }
}
