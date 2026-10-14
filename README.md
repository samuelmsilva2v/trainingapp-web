# trainingapp-web

Front-end do **TrainingApp**, um app de treino para registrar séries, repetições e cargas, com elementos de gamificação (pontos, conquistas, streaks).

Gerado com [Angular CLI](https://github.com/angular/angular-cli) 21.2.6.

## Stack

- Angular 21 (standalone, routing, SCSS) e Angular Material
- TypeScript
- Vitest (testes unitários)
- Só pt-BR, mobile-first (design Iron Pulse, do Stitch)

## Desenvolvimento

```bash
npm install
ng serve
```

Acesse `http://localhost:4200/`. A API (`trainingapp-api`) precisa estar rodando em `http://localhost:8080`: o `ng serve` encaminha `/api` para ela (`proxy.conf.json`), então o app e a API ficam na mesma origem, como em produção (sem CORS, e o cookie do login funciona). Reinicie o `ng serve` ao mudar o `proxy.conf.json`.

## Login

As telas `/entrar`, `/cadastrar`, `/esqueci-senha`, `/redefinir-senha` e `/confirmar-email` (esta e a anterior são abertas pelo link do e-mail) ficam em `src/app/auth`; as demais rotas exigem login (`autenticadoGuard`). O access token (15 min) fica só em memória e o interceptor o renova sozinho; a sessão longa é o cookie HttpOnly de refresh, então fechar o app não desloga. O botão "Entrar com Google" só aparece se a API tiver `trainingapp.auth.google-client-id` configurado.

## Telas

Rotas em `src/app/app.routes.ts`, todas carregadas sob demanda. As quatro primeiras ficam dentro da casca com a navegação por abas (`layout/casca`).

| Rota | Pasta | O que mostra |
| --- | --- | --- |
| `/hoje` | `hoje` | Próximo dia da rotação do plano ativo: iniciar, retomar o treino em andamento ou pular o dia |
| `/planos` | `planos/lista` | Seus planos; ativar um |
| `/historico` | `historico` | Treinos concluídos e abandonados, por período, com volume e recordes |
| `/perfil` | `perfil` | Nome, nível, XP e conquistas; trocar senha, excluir conta e sair |
| `/planos/novo`, `/planos/:id` | `planos/plano-editor` | Editor do plano (dias, exercícios, séries, reps e carga), com o seletor de exercícios do catálogo e o cadastro de exercício próprio |
| `/treino` | `treino` | Execução da sessão: registra as cargas e reps reais (passo de 2,5 kg), com drop-set (ligado no plano, até 3 drops em cada série, sugeridos com 80% da carga anterior em múltiplo de 5; o bloco tem um check só e conta como uma série) e, ao concluir, mostra o XP ganho e os recordes |

Estado e acesso à API ficam em `src/app/core` (stores com signals, interceptor de autenticação, modelos). Os modelos são escritos à mão em `core/modelos.ts`; ainda não há cliente gerado do OpenAPI.

O treino em andamento fica só em memória, com o indicador Salvo/Salvando/Falha: uma mudança que ainda não foi enviada se perde ao fechar a aba. Persistir localmente e enviar em fila fica para a fase de PWA/offline.

## Fontes e ícones

Inter, Outfit e Material Symbols ficam em `public/fonts` (subconjunto latin), para o app funcionar sem internet. O arquivo de ícones traz só os usados: ao usar um ícone novo, baixe de novo o CSS `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=<lista em ordem alfabética, separada por vírgula>` (com um User-Agent de navegador moderno), pegue o `.woff2` indicado no `src` e substitua `public/fonts/material-symbols.woff2`.

## Testes

```bash
ng test
```

Para rodar uma vez e sair (como na CI): `npx ng test --watch=false`.

## Build

```bash
npm run build
```

Os artefatos de build vão para `dist/trainingapp-web/browser`. O build de produção tem orçamento de tamanho: um estilo grande demais quebra o build (e, por consequência, a imagem de deploy).

A API serve esse diretório no perfil `online` e na imagem de produção, por isso o front e a API ficam na mesma origem.

## Android (Capacitor)

O app Android é este mesmo front empacotado no APK pelo Capacitor 8 (pasta `android/`, `capacitor.config.ts`). Precisa de:

- **Node 22+** (o Capacitor 8 não roda no 20). Com o nvm-windows: `nvm use 22.23.3`.
- **Android Studio 2025.2.1+** com o Android SDK e um emulador (AVD) criado no Device Manager.

```bash
npm run android:dev   # emulador, contra a API local (perfil dev rodando no PC)
npm run android       # API de produção (https://apptraining.duckdns.org/api)
```

Os dois scripts (`scripts/android.mjs`) geram o front, rodam `cap sync` e `cap run android`, que pergunta em qual aparelho ou emulador instalar.

- **`android:dev`:** usa `environment.android-dev.ts` (`http://10.0.2.2:8080/api`; no emulador, `10.0.2.2` é o `127.0.0.1` do PC) e libera HTTP sem TLS e conteúdo misto, porque a página do app é `https://localhost`. Essa liberação só existe no dev.
- **`android`:** usa `environment.android.ts`. A API precisa aceitar a origem `https://localhost` no CORS.

- **Ícone e splash:** gerados de `assets/logo.svg` (o raio do logo) com `npx @capacitor/assets generate --android --iconBackgroundColor '#121416' --iconBackgroundColorDark '#121416' --splashBackgroundColor '#121416' --splashBackgroundColorDark '#121416'`. O fundo do splash do sistema (Android 12+) é o `windowSplashScreenBackground` em `android/app/src/main/res/values/styles.xml`.
- **Barras do sistema e áreas seguras:** o `SystemBars` do Capacitor deixa os ícones claros e injeta as variáveis `--safe-area-inset-*` (o `env()` falha em WebViews antigos); os estilos usam `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`.
- **Voltar do sistema** (`core/android.ts`): fecha o diálogo aberto; nas abas Planos, Histórico e Perfil vai para Hoje; em Hoje e na tela de login fecha o app; nas outras telas volta uma.

Enquanto o Android v1 está na branch `android-v1`, a produção ainda não tem o CORS nem o refresh no corpo. Por isso, desenvolva com `android:dev`. A web não muda: `environment.ts` continua com `/api` na mesma origem.

## CI

`.github/workflows/ci.yml` roda os testes e o build a cada push na `master`. Um push aqui **não** implanta: o deploy é da esteira do `trainingapp-api` (`gh workflow run deploy.yml -R samuelmsilva2v/trainingapp-api`).

## Projeto irmão

Back-end em Spring Boot: [trainingapp-api](https://github.com/samuelmsilva2v/trainingapp-api).
