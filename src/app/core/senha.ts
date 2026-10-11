export interface Criterio {
  rotulo: string;
  ok: boolean;
}

/**
 * Critérios da senha forte. Espelham `RegrasDeSenha` da API (8+ caracteres, maiúscula, minúscula, número e símbolo) para
 * o usuário ver o que falta enquanto digita; quem decide de verdade é a API.
 */
export function criteriosDaSenha(senha: string): Criterio[] {
  return [
    { rotulo: '8+ caracteres', ok: [...senha].length >= 8 },
    { rotulo: 'Maiúscula e minúscula', ok: /\p{Lu}/u.test(senha) && /\p{Ll}/u.test(senha) },
    { rotulo: 'Número', ok: /\p{Nd}/u.test(senha) },
    { rotulo: 'Símbolo', ok: /[^\p{L}\p{Nd}]/u.test(senha) },
  ];
}

export function senhaForte(senha: string): boolean {
  return criteriosDaSenha(senha).every(c => c.ok);
}

export type Forca = { nivel: 0 | 1 | 2 | 3 | 4; rotulo: 'FRACA' | 'MÉDIA' | 'FORTE' };

/** Quantos critérios foram atendidos (0 a 4) e o rótulo do medidor: forte só com todos. */
export function forcaDaSenha(senha: string): Forca {
  const nivel = criteriosDaSenha(senha).filter(c => c.ok).length as Forca['nivel'];
  return { nivel, rotulo: nivel === 4 ? 'FORTE' : nivel >= 2 ? 'MÉDIA' : 'FRACA' };
}
