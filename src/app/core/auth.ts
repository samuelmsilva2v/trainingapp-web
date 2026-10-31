import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, share, tap, throwError, timeout } from 'rxjs';
import { AuthApi, ProvaDeIdentidade } from './api';
import { CofreRefresh } from './cofre';
import { apagarTreinoLocal } from './treino-store';
import { Acesso } from './modelos';
import { Falha, falhaDe } from './falha';

/**
 * Estado do login. O access token (15 min) fica só em memória; a sessão longa é o refresh token: na web, o cookie
 * HttpOnly que o navegador manda sozinho em /api/auth/refresh; no app Android, o {@link CofreRefresh}. Por isso fechar
 * a aba ou o app não desloga.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly cofre = inject(CofreRefresh);
  private readonly router = inject(Router);

  private token: string | null = null;
  private renovando$: Observable<string | null> | null = null;

  readonly logado = signal(false);

  get acesso(): string | null {
    return this.token;
  }

  /**
   * Na web, por que a abertura não conseguiu falar com a API (sem internet, servidor fora ou lento, acesso restrito).
   * Enquanto houver falha o app mostra a tela de erro no lugar das rotas, e o guard não manda para o login.
   */
  readonly falhaAbertura = signal<Falha | null>(null);
  /** Aviso para a tela de login (ex.: a sessão deste navegador expirou). */
  readonly avisoLogin = signal<string | null>(null);

  /** Ao abrir o app: tenta restaurar o login pelo refresh. Sem refresh válido, o guard manda para a tela de login. */
  async iniciar(): Promise<void> {
    if (this.cofre.noApp) {
      await this.cofre.carregar();
      if (!this.cofre.valor) return; // nunca entrou neste aparelho, ou saiu
      await firstValueFrom(
        this.renovar().pipe(
          catchError(() => {
            // Sem rede no app: o refresh guardado vale até a API dizer o contrário (o 401 da primeira chamada com rede
            // renova o token). Assim o treino guardado no aparelho abre mesmo sem sinal.
            if (this.cofre.valor) this.logado.set(true);
            return of(null);
          }),
        ),
      );
      return;
    }
    // Na web o cookie é HttpOnly: só a resposta da API diz se há login. Só o 401 manda para o login.
    this.falhaAbertura.set(null);
    const tinhaSessao = lerMarcaDeSessao();
    try {
      await firstValueFrom(this.api.renovar().pipe(timeout(TEMPO_ABERTURA_MS), map(acesso => this.definir(acesso))));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) {
        if (tinhaSessao) this.avisoLogin.set('Sua sessão expirou. Entre de novo.');
        await this.limpar();
      } else {
        this.falhaAbertura.set(falhaDe(e));
      }
    }
  }

  /** Nova tentativa da tela de erro da abertura: deu certo, segue para a rota pedida (ou o login, se o cookie venceu). */
  async tentarAbrirDeNovo(): Promise<void> {
    await this.iniciar();
    if (!this.falhaAbertura() && !this.logado()) await this.router.navigateByUrl('/entrar');
  }

  /** Pede um access token novo. Chamadas simultâneas (vários 401 juntos) dividem uma única requisição. */
  renovar(): Observable<string | null> {
    this.renovando$ ??= this.api.renovar().pipe(
      map(acesso => this.definir(acesso)),
      catchError((e: unknown) => {
        // Só 401/403 significam "sessão acabou"; falta de rede não derruba o login.
        if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403)) {
          void this.limpar();
          return of(null);
        }
        return throwError(() => e);
      }),
      finalize(() => (this.renovando$ = null)),
      share(),
    );
    return this.renovando$;
  }

  entrar(email: string, senha: string): Observable<void> {
    return this.api.entrar(email, senha).pipe(map(a => void this.definir(a)));
  }

  entrarComGoogle(codigo: string): Observable<void> {
    return this.api.entrarComGoogle(codigo).pipe(map(a => void this.definir(a)));
  }

  entrarComGoogleIdToken(idToken: string): Observable<void> {
    return this.api.entrarComGoogleIdToken(idToken).pipe(map(a => void this.definir(a)));
  }

  sair(): Observable<void> {
    return this.api.sair().pipe(
      catchError(() => of(undefined)),
      tap(() => {
        apagarTreinoLocal();
        this.irParaEntrar();
      }),
    );
  }

  /** Depois de apagada, a conta não existe mais: volta ao login com tudo limpo. */
  excluirConta(prova: ProvaDeIdentidade): Observable<void> {
    return this.api.excluirConta(prova).pipe(
      tap(() => {
        apagarTreinoLocal();
        this.irParaEntrar();
      }),
    );
  }

  /** Recarrega o app na tela de login: nada da conta anterior (planos, treino em andamento) fica na memória. */
  irParaEntrar(): void {
    // No app, espera apagar o refresh guardado: recarregar antes faria o app entrar de novo com ele.
    void this.limpar().finally(() => location.assign('/entrar'));
  }

  private definir(acesso: Acesso): string {
    if (acesso.refresh) void this.cofre.gravar(acesso.refresh);
    this.token = acesso.acesso;
    this.logado.set(true);
    gravarMarcaDeSessao(true);
    return acesso.acesso;
  }

  private limpar(): Promise<void> {
    this.token = null;
    this.logado.set(false);
    gravarMarcaDeSessao(false);
    return this.cofre.apagar();
  }
}

/** Tempo limite do refresh da abertura: sem ele, uma API que não responde prende o app na tela inicial. */
export const TEMPO_ABERTURA_MS = 15_000;

/** "Este navegador já entrou": distingue sessão expirada (avisa) de primeira visita (não avisa) no 401 da abertura. */
const CHAVE_SESSAO = 'trainingapp.sessao';

function lerMarcaDeSessao(): boolean {
  try {
    return localStorage.getItem(CHAVE_SESSAO) === '1';
  } catch {
    return false;
  }
}

function gravarMarcaDeSessao(ativa: boolean): void {
  try {
    if (ativa) localStorage.setItem(CHAVE_SESSAO, '1');
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem armazenamento: só não haverá o aviso de sessão expirada
  }
}

/** Com falha na abertura, deixa a rota ativar: o app mostra a tela de erro no lugar dela e retoma depois. */
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.logado() || auth.falhaAbertura() !== null || inject(Router).createUrlTree(['/entrar']);
};
