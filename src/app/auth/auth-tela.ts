import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApi, mensagemDeErro } from '../core/api';
import { AuthStore, SENHA_MINIMA } from '../core/auth';
import { carregarGoogle } from '../core/google';

/** A rota define o modo (`data.modo`); as cinco telas compartilham o cartão, os campos e o tratamento de erro. */
type Modo = 'entrar' | 'cadastrar' | 'esqueci' | 'redefinir' | 'confirmar';

@Component({
  selector: 'app-auth',
  imports: [RouterLink],
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
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  /** Mensagem de sucesso; quando existe, ela substitui o formulário. */
  protected readonly aviso = signal<string | null>(null);
  protected readonly googleAtivo = signal(false);
  protected readonly botaoGoogle = viewChild<ElementRef<HTMLElement>>('google');

  protected readonly valido = computed(() => {
    switch (this.modo) {
      case 'entrar': return this.email().includes('@') && this.senha().length > 0;
      case 'cadastrar': return this.nome().trim().length > 0 && this.email().includes('@') && this.senha().length >= SENHA_MINIMA;
      case 'esqueci': return this.email().includes('@');
      case 'redefinir': return this.senha().length >= SENHA_MINIMA;
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

  /** O botão "Entrar com Google" só aparece se a API tiver um client id configurado. */
  private iniciarGoogle(): void {
    this.api.config().subscribe({
      next: ({ googleClientId }) => {
        if (!googleClientId) return;
        carregarGoogle()
          .then(google => {
            const elemento = this.botaoGoogle()?.nativeElement;
            if (!elemento) return;
            google.initialize({
              client_id: googleClientId,
              callback: ({ credential }) =>
                this.auth.entrarComGoogle(credential).subscribe({
                  next: () => this.entrou(),
                  error: e => this.erro.set(mensagemDeErro(e)),
                }),
            });
            google.renderButton(elemento, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', locale: 'pt-BR', width: 320 });
            this.googleAtivo.set(true);
          })
          .catch(() => undefined); // sem rede para o Google: o login por senha continua disponível
      },
      error: () => undefined,
    });
  }
}
