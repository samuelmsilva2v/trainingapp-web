import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, share, tap, throwError } from 'rxjs';
import { AuthApi } from './api';
import { CofreRefresh } from './cofre';
import { Acesso } from './modelos';

/**
 * Estado do login. O access token (15 min) fica só em memória; a sessão longa é o refresh token: na web, o cookie
 * HttpOnly que o navegador manda sozinho em /api/auth/refresh; no app Android, o {@link CofreRefresh}. Por isso fechar
 * a aba ou o app não desloga.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly cofre = inject(CofreRefresh);

  private token: string | null = null;
  private renovando$: Observable<string | null> | null = null;

  readonly logado = signal(false);

  get acesso(): string | null {
    return this.token;
  }

  /** Ao abrir o app: tenta restaurar o login pelo refresh. Sem refresh válido, o guard manda para a tela de login. */
  async iniciar(): Promise<void> {
    if (this.cofre.noApp) {
      await this.cofre.carregar();
      if (!this.cofre.valor) return; // nunca entrou neste aparelho, ou saiu
    }
    await firstValueFrom(this.renovar().pipe(catchError(() => of(null))));
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

  sair(): Observable<void> {
    return this.api.sair().pipe(catchError(() => of(undefined)), tap(() => this.irParaEntrar()));
  }

  /** Depois de apagada, a conta não existe mais: volta ao login com tudo limpo. */
  excluirConta(prova: { senha?: string; codigo?: string }): Observable<void> {
    return this.api.excluirConta(prova).pipe(tap(() => this.irParaEntrar()));
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
    return acesso.acesso;
  }

  private limpar(): Promise<void> {
    this.token = null;
    this.logado.set(false);
    return this.cofre.apagar();
  }
}

export const autenticadoGuard: CanActivateFn = () => inject(AuthStore).logado() || inject(Router).createUrlTree(['/entrar']);
