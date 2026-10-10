import { Component, OnInit, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { SessoesApi, mensagemDeErro } from '../core/api';
import { Hoje, SessaoResumo } from '../core/modelos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { duracaoMinutos, formatarKg, formatarDataRelativa } from '../core/formatos';

@Component({
  selector: 'app-hoje',
  imports: [RouterLink],
  templateUrl: './hoje.html',
  styleUrl: './hoje.scss',
})
export class HojeTela implements OnInit {
  private readonly api = inject(SessoesApi);
  private readonly store = inject(TreinoStore);
  protected readonly gamificacao = inject(GamificacaoStore);
  private readonly roteador = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  protected readonly hoje = signal<Hoje | null>(null);
  protected readonly ultimo = signal<SessaoResumo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly ocupado = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly duracaoMinutos = duracaoMinutos;
  protected readonly formatarKg = formatarKg;
  protected readonly formatarDataRelativa = formatarDataRelativa;

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.hoje().subscribe({
      next: hoje => {
        this.hoje.set(hoje);
        this.carregando.set(false);
      },
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
    this.api.historico(0, 1).subscribe({
      next: lista => this.ultimo.set(lista[0] ?? null),
      error: () => this.ultimo.set(null),
    });
  }

  protected async iniciar(): Promise<void> {
    const hoje = this.hoje();
    if (!hoje?.planoId || !hoje.planoNome || !hoje.proximoDia || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await this.store.iniciar(hoje.planoId, hoje.planoNome, hoje.proximoDia);
      await this.roteador.navigate(['/treino']);
    } catch (e) {
      this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
    } finally {
      this.ocupado.set(false);
    }
  }

  protected continuar(): void {
    const sessao = this.hoje()?.sessaoEmAndamento;
    if (!sessao) return;
    if (this.store.sessao()?.id !== sessao.id) this.store.retomar(sessao);
    this.roteador.navigate(['/treino']);
  }

  protected pular(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.api.pular().subscribe({
      next: hoje => {
        this.hoje.set(hoje);
        this.ocupado.set(false);
      },
      error: e => {
        this.ocupado.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 5000 });
      },
    });
  }
}
