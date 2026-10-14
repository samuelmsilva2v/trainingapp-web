import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/** Rodando como app Android (Capacitor), e não no navegador. */
export const NO_APP = Capacitor.isNativePlatform();

const CHAVE = 'refresh';

/**
 * Refresh token do app Android, guardado no armazenamento seguro (cifrado por uma chave do Android Keystore).
 * Na web o refresh fica no cookie HttpOnly, que o navegador cuida sozinho: aqui nada é guardado.
 */
@Injectable({ providedIn: 'root' })
export class CofreRefresh {
  readonly noApp = NO_APP;
  /** Cópia em memória, lida uma vez na abertura do app. */
  valor: string | null = null;

  async carregar(): Promise<void> {
    if (!this.noApp) return;
    // O get rejeita quando a chave não existe (primeira abertura ou depois de sair).
    this.valor = await SecureStoragePlugin.get({ key: CHAVE }).then(r => r.value, () => null);
  }

  async gravar(refresh: string): Promise<void> {
    this.valor = refresh;
    if (this.noApp) await SecureStoragePlugin.set({ key: CHAVE, value: refresh });
  }

  async apagar(): Promise<void> {
    this.valor = null;
    if (this.noApp) await SecureStoragePlugin.remove({ key: CHAVE }).catch(() => undefined);
  }
}
