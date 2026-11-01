import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { NO_APP } from './cofre';

export const TEMAS = ['escuro', 'claro', 'sistema'] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_PADRAO: Tema = 'escuro';

/** O script do index.html lê a mesma chave antes da primeira pintura (sem piscar o tema escuro). */
const CHAVE_TEMA = 'trainingapp.tema';
/** --c-fundo de cada tema, para a barra do navegador (meta theme-color). */
const FUNDO = { claro: '#f4f5f2', escuro: '#121416' };
const SISTEMA_ESCURO = '(prefers-color-scheme: dark)';

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
  const claro = tema === 'claro' || (tema === 'sistema' && !matchMedia(SISTEMA_ESCURO).matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? FUNDO.claro : FUNDO.escuro);
  // Light = ícones escuros, para fundo claro.
  if (NO_APP) void SystemBars.setStyle({ style: claro ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => undefined);
}

/** Guardada para o ouvinte de troca viver enquanto o app estiver aberto. */
let sistema: MediaQueryList | undefined;

/** Na inicialização: aplica a escolha guardada e, em "Sistema", acompanha a troca de tema do aparelho. */
export function iniciarTema(): void {
  aplicarTema();
  sistema = matchMedia(SISTEMA_ESCURO);
  sistema.addEventListener('change', () => {
    if (lerTema() === 'sistema') aplicarTema('sistema');
  });
}
