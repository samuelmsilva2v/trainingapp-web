# trainingapp-web

Front-end do **TrainingApp**, um app de treino para registrar séries, repetições e cargas, com elementos de gamificação (pontos, conquistas, streaks).

Gerado com [Angular CLI](https://github.com/angular/angular-cli) 21.2.6.

## Stack

- Angular 21 (standalone, routing, SCSS)
- TypeScript
- Vitest (testes unitários)

## Desenvolvimento

```bash
npm install
ng serve
```

Acesse `http://localhost:4200/`. A API (`trainingapp-api`) precisa estar rodando em `http://localhost:8080`: o `ng serve` encaminha `/api` para ela (`proxy.conf.json`), então o app e a API ficam na mesma origem, como em produção (sem CORS, e o cookie do login funciona). Reinicie o `ng serve` ao mudar o `proxy.conf.json`.

## Login

As telas `/entrar`, `/cadastrar`, `/esqueci-senha`, `/redefinir-senha` e `/confirmar-email` (esta e a anterior são abertas pelo link do e-mail) ficam em `src/app/auth`; as demais rotas exigem login (`autenticadoGuard`). O access token (15 min) fica só em memória e o interceptor o renova sozinho; a sessão longa é o cookie HttpOnly de refresh, então fechar o app não desloga. O botão "Entrar com Google" só aparece se a API tiver `trainingapp.auth.google-client-id` configurado.

## Fontes e ícones

Inter, Outfit e Material Symbols ficam em `public/fonts` (subconjunto latin), para o app funcionar sem internet. O arquivo de ícones traz só os usados: ao usar um ícone novo, baixe de novo o CSS `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=<lista em ordem alfabética, separada por vírgula>` (com um User-Agent de navegador moderno), pegue o `.woff2` indicado no `src` e substitua `public/fonts/material-symbols.woff2`.

## Testes

```bash
ng test
```

## Build

```bash
ng build
```

Os artefatos de build vão para `dist/`.

## Projeto irmão

Back-end em Spring Boot: [trainingapp-api](https://github.com/samuelmsilva2v/trainingapp-api).
