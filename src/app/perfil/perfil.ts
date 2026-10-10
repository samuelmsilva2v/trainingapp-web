import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerfilApi, mensagemDeErro } from '../core/api';
import { formatarKg } from '../core/formatos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { Perfil } from '../core/modelos';

/** Título padrão do card do usuário; vai virar um sistema de títulos por nível. */
const TITULO_PADRAO = 'Praticante de musculação';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilTela implements OnInit {
  private readonly api = inject(PerfilApi);
  private readonly aviso = inject(MatSnackBar);
  protected readonly gamificacao = inject(GamificacaoStore);
  protected readonly formatar = formatarKg;
  protected readonly titulo = TITULO_PADRAO;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly nome = signal('');
  private readonly salvo = signal<Perfil | null>(null);
  protected readonly nomeSalvo = computed(() => this.salvo()?.nome ?? '');
  protected readonly conquistasAbertas = signal(false);
  protected readonly conquistadas = computed(() => this.gamificacao.dados()?.conquistas.filter(c => c.conquistada).length ?? 0);

  protected readonly alterado = computed(() => this.salvo()?.nome !== this.nome().trim());
  protected readonly valido = computed(() => this.nome().trim().length > 0);

  ngOnInit(): void {
    this.gamificacao.atualizar();
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.obter().subscribe({
      next: perfil => {
        this.aplicar(perfil);
        this.carregando.set(false);
      },
      error: e => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  private aplicar(perfil: Perfil): void {
    this.salvo.set(perfil);
    this.nome.set(perfil.nome);
  }

  protected salvar(): void {
    if (!this.valido() || this.salvando()) return;
    this.salvando.set(true);
    this.api.atualizar({ nome: this.nome().trim() }).subscribe({
      next: perfil => {
        this.aplicar(perfil);
        this.salvando.set(false);
        this.aviso.open('Perfil salvo.', undefined, { duration: 3000 });
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }
}
