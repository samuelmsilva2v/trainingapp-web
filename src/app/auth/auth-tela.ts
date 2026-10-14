import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApi, mensagemDeErro } from '../core/api';
import { ForcaSenha } from '../compartilhado/forca-senha';
import { AuthStore } from '../core/auth';
import { NO_APP } from '../core/cofre';
import { GoogleCodigo, criarClienteGoogle, idTokenDoGoogle } from '../core/google';
import { senhaForte } from '../core/senha';
import { Observable } from 'rxjs';

/** A rota define o modo (`data.modo`); as cinco telas compartilham o cartão, os campos e o tratamento de erro. */
type Modo = 'entrar' | 'cadastrar' | 'esqueci' | 'redefinir' | 'confirmar';

@Component({
  selector: 'app-auth',
  imports: [RouterLink, NgTemplateOutlet, ForcaSenha],
  templateUrl: './auth-tela.html',
  styleUrl: './auth-tela.scss',
})
export class AuthTela implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly modo = this.rota.snapshot.data['modo'] as Modo;
  private readonly token = this.rota.snapshot.queryParamMap.get('token') ?? '';

  protected readonly nome = signal('');
  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly confirmacao = signal('');
  protected readonly mostrarSenha = signal(false);
  protected readonly mostrarConfirmacao = signal(false);
  /** Enfeite por enquanto (não há páginas de termos nem registro do aceite): só impede avançar sem marcar. */
  protected readonly termos = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  /** Mensagem de sucesso; quando existe, ela substitui o formulário. */
  protected readonly aviso = signal<string | null>(null);
  protected readonly googleAtivo = signal(false);
  protected readonly entrandoComGoogle = signal(false);
  private clienteGoogle: GoogleCodigo | null = null;
  /** Só no app: o client id web que o Credential Manager usa. */
  private webClientId: string | null = null;

  protected readonly conferem = computed(() => this.senha() === this.confirmacao());

  protected readonly valido = computed(() => {
    switch (this.modo) {
      case 'entrar': return this.email().includes('@') && this.senha().length > 0;
      case 'cadastrar':
        return this.nome().trim().length > 0 && this.email().includes('@') && senhaForte(this.senha()) && this.conferem() && this.termos();
      case 'esqueci': return this.email().includes('@');
      case 'redefinir': return senhaForte(this.senha()) && this.conferem();
      default: return false;
    }
  });

  ngOnInit(): void {
    if (this.modo === 'confirmar') {
      this.confirmarEmail();
    } else if (this.modo === 'entrar' || this.modo === 'cadastrar') {
      if (this.auth.logado()) {
        void this.router.navigateByUrl('/hoje');
        return;
      }
      this.iniciarGoogle();
    }
  }

  protected enviar(): void {
    if (!this.valido() || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);
    const email = this.email().trim();
    const falhou = (e: unknown) => {
      this.enviando.set(false);
      this.erro.set(mensagemDeErro(e));
    };
    const concluiu = (mensagem: string) => () => {
      this.enviando.set(false);
      this.aviso.set(mensagem);
    };

    switch (this.modo) {
      case 'entrar':
        this.auth.entrar(email, this.senha()).subscribe({ next: () => this.entrou(), error: falhou });
        break;
      case 'cadastrar':
        this.api.cadastrar({ nome: this.nome().trim(), email, senha: this.senha() }).subscribe({
          next: concluiu(`Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`),
          error: falhou,
        });
        break;
      case 'esqueci':
        this.api.esqueciSenha(email).subscribe({
          next: concluiu('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.'),
          error: falhou,
        });
        break;
      case 'redefinir':
        this.api.redefinirSenha(this.token, this.senha()).subscribe({
          next: concluiu('Senha redefinida. Entre com a nova senha.'),
          error: falhou,
        });
        break;
    }
  }

  private confirmarEmail(): void {
    this.enviando.set(true);
    this.api.confirmarEmail(this.token).subscribe({
      next: () => {
        this.enviando.set(false);
        this.aviso.set('E-mail confirmado! Agora é só entrar.');
      },
      error: e => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  private entrou(): void {
    void this.router.navigateByUrl('/hoje');
  }

  /** Abre o popup do Google. O cliente já foi criado ao carregar a tela: o navegador só deixa abrir popup direto do clique. */
  protected entrarComGoogle(): void {
    this.erro.set(null);
    if (this.webClientId) {
      void this.entrarComGoogleNoApp(this.webClientId);
      return;
    }
    this.clienteGoogle?.requestCode();
  }

  private async entrarComGoogleNoApp(webClientId: string): Promise<void> {
    const idToken = await idTokenDoGoogle(webClientId).catch((e: unknown) => {
      console.warn('Login com Google no app falhou', e); // desistir também cai aqui
      return null;
    });
    if (!idToken) {
      this.erro.set('O Google não autorizou o login. Tente de novo.');
      return;
    }
    this.entrarPeloGoogle(this.auth.entrarComGoogleIdToken(idToken));
  }

  /** O botão do Google só aparece se a API tiver client id e segredo configurados e o script do Google carregar. */
  private iniciarGoogle(): void {
    this.api.config().subscribe({
      next: ({ googleClientId }) => {
        if (!googleClientId) return;
        if (NO_APP) {
          // O popup do Google não abre em WebView: no app o login é pelo Credential Manager.
          this.webClientId = googleClientId;
          this.googleAtivo.set(true);
          return;
        }
        criarClienteGoogle(
          googleClientId,
          codigo => this.codigoDoGoogle(codigo),
          // Fechar o popup é desistir, sem erro; já o navegador bloquear a abertura precisa de aviso.
          tipo => {
            if (tipo === 'popup_failed_to_open') {
              this.erro.set('Não foi possível abrir a janela do Google. Libere os pop-ups e tente de novo.');
            }
          },
        )
          .then(cliente => {
            this.clienteGoogle = cliente;
            this.googleAtivo.set(true);
          })
          .catch(() => undefined); // sem rede para o Google: o login por senha continua disponível
      },
      error: () => undefined,
    });
  }

  private codigoDoGoogle(codigo?: string): void {
    if (!codigo) {
      this.erro.set('O Google não autorizou o login. Tente de novo.');
      return;
    }
    this.entrarPeloGoogle(this.auth.entrarComGoogle(codigo));
  }

  private entrarPeloGoogle(login: Observable<void>): void {
    this.entrandoComGoogle.set(true);
    login.subscribe({
      next: () => this.entrou(),
      error: e => {
        this.entrandoComGoogle.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}
