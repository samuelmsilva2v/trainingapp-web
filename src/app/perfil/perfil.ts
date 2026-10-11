import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthApi, PerfilApi, mensagemDeErro } from '../core/api';
import { AuthStore, SENHA_MINIMA } from '../core/auth';
import { formatarKg } from '../core/formatos';
import { GoogleCodigo, criarClienteGoogle } from '../core/google';
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
  private readonly auth = inject(AuthStore);
  private readonly authApi = inject(AuthApi);
  protected readonly gamificacao = inject(GamificacaoStore);
  protected readonly formatar = formatarKg;
  protected readonly titulo = TITULO_PADRAO;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly nome = signal('');
  private readonly salvo = signal<Perfil | null>(null);
  protected readonly nomeSalvo = computed(() => this.salvo()?.nome ?? '');
  protected readonly email = computed(() => this.salvo()?.email ?? '');
  protected readonly temSenha = computed(() => this.salvo()?.temSenha ?? false);
  protected readonly trocandoSenha = signal(false);
  protected readonly senhaAtual = signal('');
  protected readonly novaSenha = signal('');
  protected readonly senhaValida = computed(() => this.senhaAtual().length > 0 && this.novaSenha().length >= SENHA_MINIMA);
  protected readonly excluindo = signal(false);
  protected readonly senhaDaExclusao = signal('');
  /** Conta só do Google: o botão de confirmar só habilita quando o popup do Google está pronto para abrir. */
  protected readonly googlePronto = signal(false);
  private clienteGoogle: GoogleCodigo | null = null;
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

  protected trocarSenha(): void {
    if (!this.senhaValida() || this.salvando()) return;
    this.salvando.set(true);
    this.authApi.trocarSenha(this.senhaAtual(), this.novaSenha()).subscribe({
      next: () => {
        this.salvando.set(false);
        this.trocandoSenha.set(false);
        this.senhaAtual.set('');
        this.novaSenha.set('');
        this.aviso.open('Senha alterada. Os outros aparelhos foram desconectados.', undefined, { duration: 4000 });
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  /** Abre a confirmação. Na conta só do Google já prepara o popup, que o navegador só deixa abrir direto de um clique. */
  protected abrirExclusao(): void {
    this.excluindo.set(true);
    if (this.temSenha() || this.clienteGoogle) return;
    this.authApi.config().subscribe({
      next: ({ googleClientId }) => {
        if (!googleClientId) return;
        criarClienteGoogle(googleClientId, codigo => this.excluirComCodigo(codigo), tipo => {
          if (tipo === 'popup_failed_to_open') {
            this.aviso.open('Não foi possível abrir a janela do Google. Libere os pop-ups e tente de novo.', 'OK', { duration: 6000 });
          }
        })
          .then(cliente => {
            this.clienteGoogle = cliente;
            this.googlePronto.set(true);
          })
          .catch(() => undefined);
      },
      error: () => undefined,
    });
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(false);
    this.senhaDaExclusao.set('');
  }

  protected excluirComSenha(): void {
    if (!this.senhaDaExclusao() || this.salvando()) return;
    this.excluir({ senha: this.senhaDaExclusao() });
  }

  protected confirmarComGoogle(): void {
    this.clienteGoogle?.requestCode();
  }

  private excluirComCodigo(codigo?: string): void {
    if (!codigo) {
      this.aviso.open('O Google não autorizou a confirmação. Tente de novo.', 'OK', { duration: 6000 });
      return;
    }
    this.excluir({ codigo });
  }

  private excluir(prova: { senha?: string; codigo?: string }): void {
    this.salvando.set(true);
    // Deu certo: o app recarrega na tela de login e nada da conta fica na memória.
    this.auth.excluirConta(prova).subscribe({
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  protected sair(): void {
    this.auth.sair().subscribe();
  }
}
