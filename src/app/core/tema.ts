import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { NO_APP } from './cofre';
import { guardar, lerArmazenado } from './armazenamento';

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
  const guardado = lerArmazenado(CHAVE_TEMA);
  return TEMAS.find(t => t === guardado) ?? TEMA_PADRAO;
}

export function salvarTema(tema: Tema): void {
  guardar(CHAVE_TEMA, tema);
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
  // A tela de temas grava a escolha sem esperar: um perfil que chegue antes da resposta traria o tema antigo.
  if (gravando) return lerTema();
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

let gravando = false;
/** Marca a gravação do tema na conta em andamento (ver `aplicarTemaDaConta`). */
export function gravandoTema(ativo: boolean): void {
  gravando = ativo;
}

/** Os 11 temas na ordem de desbloqueio, com o nome mostrado na tela de temas. */
export const ORDEM_DOS_TEMAS: readonly { tema: Tema; nome: string }[] = [
  { tema: 'escuro', nome: 'Escuro' },
  { tema: 'claro', nome: 'Claro' },
  { tema: 'chrome', nome: 'Chrome' },
  { tema: 'electric', nome: 'Electric' },
  { tema: 'ignite', nome: 'Ignite' },
  { tema: 'commando-mata', nome: 'Commando Jungle' },
  { tema: 'commando-deserto', nome: 'Commando Desert' },
  { tema: 'cyberpunk', nome: 'Cyberpunk' },
  { tema: 'japao-sakura', nome: 'Sakura' },
  { tema: 'japao-hokusai', nome: 'Hokusai' },
  { tema: 'japao-sumie', nome: 'Sumi-e' },
];
export const nomeDoTema = (tema: Tema): string => ORDEM_DOS_TEMAS.find(t => t.tema === tema)?.nome ?? tema;

/** XP total para chegar ao nível (espelha `Regras.xpParaNivel` da API: 100 × n^1,5, arredondado para cima). */
export const xpDoNivel = (nivel: number): number => Math.ceil(100 * nivel ** 1.5);

/** Próximo tema a liberar e o caminho até ele, desde o último tema liberado; null quando todos já estão livres. */
export function proximoTema(nivel: number, xp: number): { tema: Tema; nivel: number; faltam: number; fracao: number } | null {
  const proximo = ORDEM_DOS_TEMAS.find(t => (NIVEL_DO_TEMA[t.tema] ?? 0) > nivel);
  if (!proximo) return null;
  const alvo = NIVEL_DO_TEMA[proximo.tema]!;
  const anterior = Math.max(0, ...ORDEM_DOS_TEMAS.map(t => NIVEL_DO_TEMA[t.tema] ?? 0).filter(n => n <= nivel));
  const de = anterior > 0 ? xpDoNivel(anterior) : 0, ate = xpDoNivel(alvo);
  return { tema: proximo.tema, nivel: alvo, faltam: Math.max(0, ate - xp), fracao: Math.min(1, Math.max(0, (xp - de) / (ate - de))) };
}

/** Temas liberados para o nível. */
export const temasLiberados = (nivel: number): number => ORDEM_DOS_TEMAS.filter(t => nivel >= (NIVEL_DO_TEMA[t.tema] ?? 0)).length;

const TOKENS_DA_AMOSTRA = ['--c-fundo', '--c-sup-2', '--c-texto', '--c-primaria', '--c-sobre-primaria', '--c-destaque', '--fonte-titulo'];
const coresGuardadas = new Map<Tema, Record<string, string>>();
/**
 * Cores e fonte de um tema para as miniaturas, lidas do próprio styles.scss (sem copiar as cores aqui): troca o
 * data-tema por um instante e lê os tokens, sem pintar no meio. `light-dark()` fica como está e resolve pelo
 * `color-scheme` da miniatura (`ehTemaClaro`).
 */
export function coresDoTema(tema: Tema): Record<string, string> {
  let cores = coresGuardadas.get(tema);
  if (!cores) {
    const html = document.documentElement, atual = html.dataset['tema'];
    html.dataset['tema'] = tema;
    const estilo = getComputedStyle(html);
    cores = Object.fromEntries(TOKENS_DA_AMOSTRA.map(t => [t, estilo.getPropertyValue(t).trim()]));
    if (atual === undefined) delete html.dataset['tema']; else html.dataset['tema'] = atual;
    coresGuardadas.set(tema, cores);
  }
  return cores;
}
export const ehTemaClaro = (tema: Tema): boolean => CLAROS.includes(tema);
