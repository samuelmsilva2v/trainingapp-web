import { Peso } from './modelos';

/** Suavização diária da tendência (10%, como no Hacker's Diet). */
const SUAVIZACAO = 0.1;
const DIA_MS = 86_400_000;

/** Dia de hoje no fuso do aparelho, como a API espera (AAAA-MM-DD). */
export function hojeIso(agora = new Date()): string {
  const dois = (n: number) => n.toString().padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

/** Dias inteiros de `de` até `ate` (datas AAAA-MM-DD). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / DIA_MS);
}

/**
 * Tendência (média móvel exponencial) de cada pesagem, em ordem de data. Com intervalos irregulares a suavização
 * vale por dia: depois de n dias sem pesar, o peso novo pesa 1 − 0,9ⁿ, como se o peso tivesse ficado igual nesses dias.
 */
export function tendencia(pesos: readonly Peso[]): number[] {
  const resultado: number[] = [];
  pesos.forEach((p, i) => {
    if (i === 0) {
      resultado.push(p.kg);
      return;
    }
    const anterior = resultado[i - 1];
    const peso = 1 - (1 - SUAVIZACAO) ** Math.max(1, diasEntre(pesos[i - 1].data, p.data));
    resultado.push(anterior + peso * (p.kg - anterior));
  });
  return resultado;
}

