import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { IntegracaoAndroid } from './core/android';
import { AuthStore } from './core/auth';
import { autenticacaoInterceptor } from './core/auth.interceptor';
import { NO_APP } from './core/cofre';
import { iniciarTema } from './core/tema';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([autenticacaoInterceptor])),
    // Antes da primeira rota: restaura o login pelo cookie, para o guard já saber se há sessão.
    provideAppInitializer(() => inject(AuthStore).iniciar()),
    provideAppInitializer(iniciarTema),
    provideAppInitializer(() => {
      if (NO_APP) inject(IntegracaoAndroid).iniciar();
    }),
  ]
};
