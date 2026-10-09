import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { PlanosApi, mensagemDeErro } from '../../core/api';
import { PlanoResumo } from '../../core/modelos';
import { rotuloObjetivo } from '../../core/rotulos';
import { ConfirmarDialogo } from '../../compartilhado/confirmar-dialogo';

@Component({
  selector: 'app-planos-lista',
  imports: [RouterLink],
  templateUrl: './planos-lista.html',
  styleUrl: './planos-lista.scss',
})
export class PlanosLista implements OnInit {
  private readonly api = inject(PlanosApi);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly planos = signal<PlanoResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly rotuloObjetivo = rotuloObjetivo;

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
      },
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
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
