import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthStore } from './core/auth';
import { autenticacaoInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([autenticacaoInterceptor])),
    // Antes da primeira rota: restaura o login pelo cookie, para o guard já saber se há sessão.
    provideAppInitializer(() => inject(AuthStore).iniciar()),
  ]
};
