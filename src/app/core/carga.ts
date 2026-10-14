/** Passo do "+/−" de carga (kg), no treino e no editor de plano. */
export const PASSO_CARGA = 2.5;
export const CARGA_MAX = 9999.99;

/** Próximo valor na grade de 2,5 kg: de 23, "+" vai a 25 e "−" a 22,5 (de 25, a 27,5 e 22,5). Nunca fica negativo. */
export function passoCarga(atual: number, sinal: 1 | -1): number {
  const degraus = atual / PASSO_CARGA;
  const base = sinal > 0 ? Math.floor(degraus + 1e-9) : Math.ceil(degraus - 1e-9);
  return limparCarga((base + sinal) * PASSO_CARGA);
}

/** Carga digitada: entre 0 e o máximo, com até 2 casas (anilha de 1,25 kg: 21,25). */
export function limparCarga(valor: number): number {
  return Math.round(Math.min(CARGA_MAX, Math.max(0, valor)) * 100) / 100;
}
