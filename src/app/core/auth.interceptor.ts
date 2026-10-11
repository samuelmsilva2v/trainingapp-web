import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URL } from './api';
import { AuthStore } from './auth';

// Os endpoints de login são públicos: mandar um token vencido neles faz a API responder 401 sem necessidade.
const PRIVADAS_DO_AUTH = [`${API_URL}/auth/sair-todos`, `${API_URL}/auth/trocar-senha`, `${API_URL}/auth/excluir-conta`];

function precisaDeToken(url: string): boolean {
  return url.startsWith(API_URL) && (!url.startsWith(`${API_URL}/auth/`) || PRIVADAS_DO_AUTH.includes(url));
}

/** Põe o Bearer nas chamadas da API; num 401 renova o token uma vez e repete. Se nem o refresh vale, volta ao login. */
export const autenticacaoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!precisaDeToken(req.url)) return next(req);
  const auth = inject(AuthStore);
  const comToken = (token: string | null): HttpRequest<unknown> =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(comToken(auth.acesso)).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse) || e.status !== 401) return throwError(() => e);
      return auth.renovar().pipe(
        switchMap(token => {
          if (token) return next(comToken(token));
          auth.irParaEntrar();
          return throwError(() => e);
        }),
      );
    }),
  );
};
