import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { NO_APP } from './cofre';

// "sistema" saiu em 2026-11-19: quem tinha ele guardado volta ao padrão pelo lerTema.
// O Commando é um tema só com duas camuflagens: cada uma é um valor próprio, para o tema guardado e o
// script do index.html seguirem funcionando sem mudança.
export const TEMAS = ['escuro', 'claro', 'ignite', 'chrome', 'cyberpunk', 'commando-deserto', 'commando-mata'] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_PADRAO: Tema = 'escuro';
/** Temas desbloqueáveis: nível mínimo para escolher. Só cosmético, por isso a trava fica no front. */
export const NIVEL_DO_TEMA: Partial<Record<Tema, number>> = {
  chrome: 5,
  cyberpunk: 15,
  'commando-deserto': 20,
  'commando-mata': 20,
};

/** O script do index.html lê a mesma chave antes da primeira pintura (sem piscar o tema escuro). */
const CHAVE_TEMA = 'trainingapp.tema';
/** --c-fundo de cada tema, para a barra do navegador (meta theme-color). */
const FUNDO: Partial<Record<Tema, string>> = {
  claro: '#f4f5f2',
  escuro: '#121416',
  ignite: '#0b0c10',
  chrome: '#151617',
  cyberpunk: '#0b1026',
  'commando-deserto': '#3b3427',
  'commando-mata': '#0a0f0b',
};
/** Temas de fundo claro: as barras do Android usam ícones escuros. */
const CLAROS: readonly Tema[] = ['claro'];

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

/** Na inicialização: aplica a escolha guardada. */
export function iniciarTema(): void {
  aplicarTema();
}
