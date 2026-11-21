import { Component } from '@angular/core';

type Arte = 'commando' | 'cyberpunk' | 'electric' | 'ignite' | 'hokusai' | 'sumie';
const ARTE_DO_TEMA: Record<string, Arte> = {
  'commando-deserto': 'commando', 'commando-mata': 'commando', cyberpunk: 'cyberpunk', electric: 'electric', ignite: 'ignite',
  'japao-hokusai': 'hokusai', 'japao-sumie': 'sumie',
};
const tema = () => document.documentElement.dataset['tema'] ?? '';

/** Título e texto do histórico vazio nos temas que têm o seu (prévia aprovada em 2026-11-21); null usa o padrão. */
export function textoVazioDoTema(): { titulo: string; texto: string } | null {
  switch (ARTE_DO_TEMA[tema()]) {
    case 'commando': return { titulo: 'SEM ORDENS NO MOMENTO', texto: 'Monte um plano para receber a primeira missão.' };
    case 'cyberpunk': return { titulo: 'NENHUM REGISTRO ENCONTRADO', texto: 'Inicie o primeiro treino para gravar dados.' };
    case 'electric': return { titulo: 'Nenhum treino ainda', texto: 'Sem carga por aqui. Ligue o primeiro treino.' };
    case 'ignite': return { titulo: 'Nenhum treino ainda', texto: 'O carvão está pronto. Acenda o primeiro treino.' };
    case 'hokusai': return { titulo: 'Nenhum treino ainda', texto: 'Hora de levantar a primeira onda.' };
    case 'sumie': return { titulo: 'Nenhum treino ainda', texto: 'O papel está em branco. Comece o primeiro traço.' };
    default: return null;
  }
}

/**
 * Ilustração dos estados vazios: o desenho do tema quando ele tem um (prévias aprovadas em 2026-11-21),
 * senão o conteúdo projetado (o ícone padrão da tela). Só decoração: tudo fica fora do leitor de tela.
 */
@Component({
  selector: 'app-ilustracao-vazio',
  template: `
    @switch (arte) {
      @case ('commando') {
        <svg viewBox="0 0 120 84" aria-hidden="true"><rect x="28" y="10" width="64" height="66" rx="3" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".6"/><rect x="48" y="4" width="24" height="12" rx="2" fill="currentColor" opacity=".45"/><path d="M38 32 H82 M38 44 H74 M38 56 H66" stroke="currentColor" stroke-width="2.5" opacity=".35"/></svg>
      }
      @case ('cyberpunk') {
        <svg viewBox="0 0 120 84" aria-hidden="true"><rect x="14" y="10" width="92" height="64" fill="none" stroke="#08d9d6" stroke-width="1.5"/><path d="M24 28 h14 M24 40 h34" stroke="#08d9d6" stroke-width="2.5"/><rect class="cursor" x="62" y="36" width="8" height="8" fill="#ff2e63"/></svg>
      }
      @case ('electric') {
        <!-- Rebaixo hexagonal da tomada brasileira (NBR 14136), com o terra ao centro e um pouco abaixo. -->
        <svg viewBox="0 0 130 92" aria-hidden="true"><g transform="translate(65 46) scale(1.75) translate(-65 -46)">
          <path d="M47.5 30.5 L82.5 30.5 Q85 30.5 86.3 32.7 L94 45 Q95.2 46 94 47 L86.3 59.3 Q85 61.5 82.5 61.5 L47.5 61.5 Q45 61.5 43.7 59.3 L36 47 Q34.8 46 36 45 L43.7 32.7 Q45 30.5 47.5 30.5 Z"
                fill="color-mix(in srgb, #b9a8ff 10%, transparent)" stroke="#b9a8ff" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="53" cy="44.5" r="3.4" fill="var(--c-fundo)" stroke="#b9a8ff" stroke-width="1.2"/>
          <circle cx="77" cy="44.5" r="3.4" fill="var(--c-fundo)" stroke="#b9a8ff" stroke-width="1.2"/>
          <circle cx="65" cy="49" r="3.4" fill="var(--c-fundo)" stroke="#b9a8ff" stroke-width="1.2"/>
        </g></svg>
      }
      @case ('ignite') {
        <svg viewBox="0 0 120 84" aria-hidden="true"><ellipse cx="60" cy="74" rx="40" ry="6" fill="#00000055"/><path d="M30 72 Q40 50 58 55 Q78 42 90 72 Z" fill="#2c2f36"/><path d="M44 66 Q52 58 60 62" stroke="#3a3e46" stroke-width="2" fill="none"/><circle cx="54" cy="64" r="2.4" fill="#ff4e00" opacity=".6"/></svg>
      }
      @case ('hokusai') {
        <!-- Recorte da crista de "A Grande Onda de Kanagawa" (Hokusai, 1831, domínio público), sem o céu. -->
        <span class="onda" aria-hidden="true"></span>
      }
      @case ('sumie') {
        <!-- Pincel recortado de "Writing brushes" (1878, Library of Congress, domínio público) ao lado de uma pincelada. -->
        <span class="papel" aria-hidden="true">
          <svg class="traco" viewBox="0 0 120 18"><defs><filter id="vazio-borda"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs>
            <path d="M4 12 C24 4 46 15 70 9 S106 6 116 8" stroke="#1c1a17" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#vazio-borda)" opacity=".88"/></svg>
          <img class="pincel" src="/temas/pincel.webp" alt="">
        </span>
      }
      @default { <ng-content /> }
    }
  `,
  styles: `
    :host { display: contents; }
    svg { width: 130px; height: 92px; overflow: visible; color: var(--c-texto); }
    .cursor { animation: piscar 1s steps(1) infinite; }
    @keyframes piscar { 50% { opacity: 0; } }
    /* O recorte termina reto embaixo e à esquerda (borda da gravura): as duas bordas se dissolvem no fundo. */
    .onda { display: block;
      width: 250px; max-width: 100%; aspect-ratio: 480 / 318; background: url('/temas/onda-recorte.webp') center / contain no-repeat;
      -webkit-mask-image: linear-gradient(to top, transparent, #000 30%), linear-gradient(to right, transparent, #000 16%); -webkit-mask-composite: source-in;
      mask-image: linear-gradient(to top, transparent, #000 30%), linear-gradient(to right, transparent, #000 16%); mask-composite: intersect;
    }
    .papel { display: block; position: relative; width: 230px; max-width: 100%; height: 110px; background: #f7f2e7; box-shadow: inset 0 0 0 1px #d8cdb6; overflow: hidden; }
    .papel .traco { position: absolute; left: 14px; top: 62px; width: 100px; height: 18px; }
    /* A ponta das cerdas (lado esquerdo da imagem) pousa no fim da pincelada; o cabo sobe para a direita. */
    .papel .pincel { position: absolute; left: 106px; top: 66px; width: 120px; height: auto; transform: translateY(-50%) rotate(-24deg); transform-origin: 0 50%; }
    @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
  `,
})
export class IlustracaoVazio {
  protected readonly arte: Arte | null = ARTE_DO_TEMA[tema()] ?? null;
}
