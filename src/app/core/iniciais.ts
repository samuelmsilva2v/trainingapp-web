/** Partículas que não contam como sobrenome ("Samuel Maciel da Silva" → SM). */
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Iniciais do avatar sem foto (web#60): primeira letra do primeiro nome e do primeiro sobrenome, em maiúsculas e sem
 * acento. Só um nome: uma letra. Nome vazio: a primeira letra do e-mail.
 */
export function iniciais(nome: string, email: string): string {
  const partes = semAcento(nome).trim().split(/\s+/).filter(p => p && !PARTICULAS.has(p.toLowerCase()));
  const letras = partes.length >= 2 ? partes[0][0] + partes[1][0] : (partes[0]?.[0] ?? semAcento(email.trim())[0] ?? '');
  return letras.toUpperCase();
}
