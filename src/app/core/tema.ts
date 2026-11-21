import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { NO_APP } from './cofre';

// "sistema" saiu em 2026-11-19: quem tinha ele guardado volta ao padrão pelo lerTema.
// O Commando é um tema só com duas camuflagens: cada uma é um valor próprio, para o tema guardado e o
// script do index.html seguirem funcionando sem mudança. O Japan segue o mesmo modelo, com três variantes.
export const TEMAS = ['escuro', 'claro', 'ignite', 'chrome', 'electric', 'cyberpunk', 'commando-deserto', 'commando-mata',
  'japao-sakura', 'japao-hokusai', 'japao-sumie'] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_PADRAO: Tema = 'escuro';
/** Temas desbloqueáveis: nível mínimo para escolher. Só cosmético, por isso a trava fica no front. */
export const NIVEL_DO_TEMA: Partial<Record<Tema, number>> = {
  // Ordem de desbloqueio: Chrome > Electric > Ignite > Commando > Cyberpunk > Japan.
  chrome: 5,
  electric: 10,
  ignite: 15,
  'commando-deserto': 20,
  'commando-mata': 20,
  cyberpunk: 25,
  'japao-sakura': 30,
  'japao-hokusai': 30,
  'japao-sumie': 30,
};

/** O script do index.html lê a mesma chave antes da primeira pintura (sem piscar o tema escuro). */
const CHAVE_TEMA = 'trainingapp.tema';
/** --c-fundo de cada tema, para a barra do navegador (meta theme-color). */
const FUNDO: Partial<Record<Tema, string>> = {
  claro: '#f4f5f2',
  escuro: '#121416',
  ignite: '#0b0c10',
  chrome: '#151617',
  electric: '#0e0c1a',
  cyberpunk: '#0b1026',
  'commando-deserto': '#3b3427',
  'commando-mata': '#0a0f0b',
  'japao-sakura': '#1d1320',
  'japao-hokusai': '#0c1828',
  'japao-sumie': '#efe8da',
};
/** Temas de fundo claro: as barras do Android usam ícones escuros. */
const CLAROS: readonly Tema[] = ['claro', 'japao-sumie'];

/** Guardado só no aparelho; valor estranho ou sem armazenamento volta ao padrão. */
export function lerTema(): Tema {
  try {
    return TEMAS.find(t => t === localStorage.getItem(CHAVE_TEMA)) ?? TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO;
  }
}

export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // sem armazenamento: o tema vale só até fechar o app
  }
  aplicarTema(tema);
}

/**
 * O `data-tema` do <html> escolhe o `color-scheme`, e os tokens (light-dark) e o Angular Material seguem sozinhos.
 * A barra do navegador e as barras do Android não leem CSS: recebem o tema efetivo aqui.
 */
export function aplicarTema(tema: Tema = lerTema()): void {
  document.documentElement.dataset['tema'] = tema;
  const claro = CLAROS.includes(tema);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', FUNDO[tema] ?? FUNDO.escuro!);
  // Light = ícones escuros, para fundo claro.
  if (NO_APP) void SystemBars.setStyle({ style: claro ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => undefined);
}

/**
 * Quando o perfil chega: o tema da conta vence o do aparelho. A cópia no aparelho continua servindo para pintar
 * a tela antes do login (script do index.html). Conta que nunca escolheu (null) fica com o tema do aparelho.
 */
export function aplicarTemaDaConta(tema: string | null | undefined): Tema {
  const daConta = TEMAS.find(t => t === tema);
  if (daConta && daConta !== lerTema()) salvarTema(daConta);
  return lerTema();
}

/**
 * Conta que nunca escolheu tema herda o do aparelho, que pode estar travado para ela (deixado por outra conta).
 * Chamado quando o nível da conta chega; volta ao padrão se o tema guardado ainda não foi liberado.
 */
export function conferirTema(nivel: number): Tema {
  const tema = lerTema();
  const minimo = NIVEL_DO_TEMA[tema];
  if (!minimo || nivel >= minimo) return tema;
  salvarTema(TEMA_PADRAO);
  return TEMA_PADRAO;
}

/** Na inicialização: aplica a escolha guardada. */
export function iniciarTema(): void {
  aplicarTema();
}
