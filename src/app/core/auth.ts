import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, share, tap, throwError } from 'rxjs';
import { AuthApi } from './api';
import { Acesso } from './modelos';

export const SENHA_MINIMA = 8;

/**
 * Estado do login. O access token (15 min) fica só em memória; a sessão longa é o cookie HttpOnly de refresh,
 * que o navegador manda sozinho em /api/auth/refresh. Por isso fechar a aba ou o app não desloga.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);

  private token: string | null = null;
  private renovando$: Observable<string | null> | null = null;

  readonly logado = signal(false);

  get acesso(): string | null {
    return this.token;
  }

  /** Ao abrir o app: tenta restaurar o login pelo cookie. Sem cookie válido, o guard manda para a tela de login. */
  async iniciar(): Promise<void> {
    await firstValueFrom(this.renovar().pipe(catchError(() => of(null))));
  }

  /** Pede um access token novo. Chamadas simultâneas (vários 401 juntos) dividem uma única requisição. */
  renovar(): Observable<string | null> {
    this.renovando$ ??= this.api.renovar().pipe(
      map(acesso => this.definir(acesso)),
      catchError((e: unknown) => {
        // Só 401/403 significam "sessão acabou"; falta de rede não derruba o login.
        if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403)) {
          this.limpar();
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

  entrarComGoogle(credencial: string): Observable<void> {
    return this.api.entrarComGoogle(credencial).pipe(map(a => void this.definir(a)));
  }

  sair(): Observable<void> {
    return this.api.sair().pipe(catchError(() => of(undefined)), tap(() => this.irParaEntrar()));
  }

  sairDeTodos(): Observable<void> {
    return this.api.sairDeTodos().pipe(tap(() => this.irParaEntrar()));
  }

  /** Recarrega o app na tela de login: nada da conta anterior (planos, treino em andamento) fica na memória. */
  irParaEntrar(): void {
    this.limpar();
    location.assign('/entrar');
  }

  private definir(acesso: Acesso): string {
    this.token = acesso.acesso;
    this.logado.set(true);
    return acesso.acesso;
  }

  private limpar(): void {
    this.token = null;
    this.logado.set(false);
  }
}

export const autenticadoGuard: CanActivateFn = () => inject(AuthStore).logado() || inject(Router).createUrlTree(['/entrar']);
