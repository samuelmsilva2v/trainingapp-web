import { Component, OnInit, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanosApi, mensagemDeErro } from '../../core/api';
import { Falha, falhaDe } from '../../core/falha';
import { cronometro, faixaReps } from '../../core/formatos';
import { PlanoCompartilhado } from '../../core/modelos';
import { rotuloObjetivo } from '../../core/rotulos';
import { Carregando } from '../../compartilhado/carregando';
import { TelaErro } from '../../compartilhado/tela-erro';

/** Prévia do plano que chegou por link: quem abre escolhe salvar uma cópia (com ou sem ativar) ou não. */
@Component({
  selector: 'app-plano-compartilhado',
  imports: [Carregando, TelaErro],
  templateUrl: './plano-compartilhado.html',
  styleUrl: './plano-compartilhado.scss',
})
export class PlanoCompartilhadoTela implements OnInit {
  private readonly api = inject(PlanosApi);
  private readonly router = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly plano = signal<PlanoCompartilhado | null>(null);
  protected readonly erro = signal<Falha | null>(null);
  protected readonly salvando = signal(false);
  protected readonly rotuloObjetivo = rotuloObjetivo;
  protected readonly faixaReps = faixaReps;
  protected readonly cronometro = cronometro;

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.erro.set(null);
    this.api.compartilhado(this.token).subscribe({
      next: p => this.plano.set(p),
      error: e => this.erro.set(falhaDe(e)),
    });
  }

  protected salvar(ativar: boolean): void {
    this.salvando.set(true);
    this.api.salvarCompartilhado(this.token, ativar).subscribe({
      next: p => {
        this.aviso.open(p.ativo ? 'Plano salvo e ativado.' : 'Plano salvo.', undefined, { duration: 3000 });
        void this.router.navigateByUrl('/planos');
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
      },
    });
  }

  protected agoraNao(): void {
    void this.router.navigateByUrl('/hoje');
  }
}
