/**
 * Parte do Google Identity Services que o app usa: o fluxo de código em popup
 * (https://developers.google.com/identity/oauth2/web/guides/use-code-model). O front só recebe um código de uso
 * único e o entrega à API, que o troca por tokens com o client secret.
 */
export interface GoogleCodigo {
  /** Abre o popup do Google; precisa ser chamado direto do clique do usuário, senão o navegador bloqueia. */
  requestCode(): void;
}

interface GoogleOauth2 {
  initCodeClient(config: {
    client_id: string;
    scope: string;
    ux_mode: 'popup';
    callback: (resposta: { code?: string; error?: string }) => void;
    error_callback?: (erro: { type: string }) => void;
  }): GoogleCodigo;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOauth2 } };
  }
}

let carregamento: Promise<GoogleOauth2> | null = null;

/** Baixa o script do Google uma vez só. Rejeita (e permite tentar de novo) se estiver sem rede. */
export function carregarGoogle(): Promise<GoogleOauth2> {
  carregamento ??= new Promise<GoogleOauth2>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google!.accounts.oauth2);
    script.onerror = () => {
      carregamento = null;
      reject(new Error('Não foi possível carregar o login do Google.'));
    };
    document.head.appendChild(script);
  });
  return carregamento;
}

/**
 * Cria o cliente do popup. Chame {@link GoogleCodigo.requestCode} só depois, direto de um clique. `aoReceber` recebe o
 * código (sem código = o Google não autorizou); `aoFalhar` recebe o tipo do erro do popup (ex.: `popup_failed_to_open`).
 */
export async function criarClienteGoogle(
  clientId: string,
  aoReceber: (codigo?: string) => void,
  aoFalhar: (tipo: string) => void,
): Promise<GoogleCodigo> {
  const google = await carregarGoogle();
  return google.initCodeClient({
    client_id: clientId,
    scope: 'openid email profile',
    ux_mode: 'popup',
    callback: ({ code }) => aoReceber(code),
    error_callback: ({ type }) => aoFalhar(type),
  });
}
