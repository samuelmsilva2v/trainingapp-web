/** Parte do Google Identity Services que o app usa (https://developers.google.com/identity/gsi/web/reference/js-reference). */
interface GoogleId {
  initialize(config: { client_id: string; callback: (resposta: { credential: string }) => void }): void;
  renderButton(elemento: HTMLElement, opcoes: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let carregamento: Promise<GoogleId> | null = null;

/** Baixa o script do Google uma vez só. Rejeita (e permite tentar de novo) se estiver sem rede. */
export function carregarGoogle(): Promise<GoogleId> {
  carregamento ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google!.accounts.id);
    script.onerror = () => {
      carregamento = null;
      reject(new Error('Não foi possível carregar o login do Google.'));
    };
    document.head.appendChild(script);
  });
  return carregamento;
}
