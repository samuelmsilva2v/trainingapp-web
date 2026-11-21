/**
 * Acesso ao localStorage do aparelho. Ele pode lançar (navegação privada, cota cheia, armazenamento bloqueado): aí a
 * leitura devolve null e a gravação não faz nada, e o app segue só com o que está na memória.
 */
export function lerArmazenado(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

/** Lê um valor gravado como JSON; ausente ou inválido devolve null. */
export function lerJson<T>(chave: string): T | null {
  const texto = lerArmazenado(chave);
  try {
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

/** Grava o valor; null apaga a chave. */
export function guardar(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento: vale só até fechar o app
  }
}
