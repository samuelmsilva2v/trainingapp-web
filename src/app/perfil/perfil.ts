import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerfilApi, mensagemDeErro } from '../core/api';
import { formatarKg } from '../core/formatos';
import { GamificacaoStore } from '../core/gamificacao-store';
import { Perfil } from '../core/modelos';

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

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly nome = signal('');
  protected readonly fuso = signal('');
  private readonly salvo = signal<Perfil | null>(null);

  protected readonly fusoDoAparelho = Intl.DateTimeFormat().resolvedOptions().timeZone;
  private readonly todosFusos: string[] = Intl.supportedValuesOf('timeZone');

  /** Lista de fusos garantindo que o valor atual (mesmo que fora da lista do navegador) apareça. */
  protected readonly fusos = computed(() => {
    const atual = this.fuso();
    return !atual || this.todosFusos.includes(atual) ? this.todosFusos : [atual, ...this.todosFusos];
  });

  protected readonly alterado = computed(() => {
    const s = this.salvo();
    return !!s && (s.nome !== this.nome().trim() || s.fusoHorario !== this.fuso());
  });
  protected readonly valido = computed(() => this.nome().trim().length > 0 && this.fuso().length > 0);

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
    this.fuso.set(perfil.fusoHorario);
  }

  protected salvar(): void {
    if (!this.valido() || this.salvando()) return;
    this.salvando.set(true);
    this.api.atualizar({ nome: this.nome().trim(), fusoHorario: this.fuso() }).subscribe({
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
