/** Passos do "+/−" de carga (kg), no treino e no editor de plano; a pessoa escolhe em Configurações de treino. */
export const PASSOS_CARGA = [1, 2.5, 5] as const;
export type PassoCarga = (typeof PASSOS_CARGA)[number];
export const PASSO_PADRAO: PassoCarga = 2.5;
export const CARGA_MAX = 9999.99;

const CHAVE_PASSO = 'trainingapp.passoCarga';

/** Guardado só no aparelho; valor estranho ou sem armazenamento volta ao padrão. */
export function lerPassoCarga(): PassoCarga {
  try {
    const valor = Number(localStorage.getItem(CHAVE_PASSO));
    return PASSOS_CARGA.find(p => p === valor) ?? PASSO_PADRAO;
  } catch {
    return PASSO_PADRAO;
  }
}

export function salvarPassoCarga(passo: PassoCarga): void {
  try {
    localStorage.setItem(CHAVE_PASSO, String(passo));
  } catch {
    // sem armazenamento: o passo vale só até fechar o app
  }
}

/** Próximo valor na grade do passo: com 2,5, de 23 o "+" vai a 25 e o "−" a 22,5 (de 25, a 27,5 e 22,5). Nunca fica negativo. */
export function passoCarga(atual: number, sinal: 1 | -1, passo: number = lerPassoCarga()): number {
  const degraus = atual / passo;
  const base = sinal > 0 ? Math.floor(degraus + 1e-9) : Math.ceil(degraus - 1e-9);
  return limparCarga((base + sinal) * passo);
}

/** Carga digitada: entre 0 e o máximo, com até 2 casas (anilha de 1,25 kg: 21,25). */
export function limparCarga(valor: number): number {
  return Math.round(Math.min(CARGA_MAX, Math.max(0, valor)) * 100) / 100;
}
