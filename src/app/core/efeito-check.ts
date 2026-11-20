/**
 * Efeito ao concluir uma série, um por tema (nada com "reduzir movimento" ou sem Web Animations):
 * - Escuro e Claro: pulso, um anel da cor principal que se expande a partir do check.
 * - Ignite: onda de calor, duas ondas laranja e o botão brilhando.
 * - Chrome: carimbo, o check desce como uma prensa e um reflexo prateado passa por ele.
 * - Cyberpunk: falha, tranco com faixas rosa e ciano deslocadas antes de assentar.
 * - Commando (as três camuflagens): carimbo "SÉRIE OK" sobre o check.
 * Recebe o check já no lugar final (o Treino chama depois de redesenhar a tela). Anéis, reflexo e faixas
 * ficam no <body> com `position: fixed`, para não serem cortados pelo card nem pelo chanfro do check.
 */
export function efeitoDoCheck(check: HTMLElement): void {
  if (matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!check.animate) return;
  // As três camuflagens do Commando ("commando-selva" etc.) dividem o mesmo efeito.
  const tema = (document.documentElement.dataset['tema'] ?? '').split('-')[0];
  (EFEITOS[tema] ?? pulso)(check);
}

/** Efeito de cada tema; os que não estão aqui (Escuro e Claro) usam o pulso. */
const EFEITOS: Record<string, (check: HTMLElement) => void> = {
  ignite: ondaDeCalor,
  chrome: carimbo,
  cyberpunk: falha,
  commando: carimboOk,
};

/** Camada solta no <body>, do tamanho e no lugar do check, que some ao fim da animação. */
function camada(check: HTMLElement, classe: string, escala = 1): HTMLElement {
  const { left, top, width, height } = check.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = `efeito-check ${classe}`;
  el.style.cssText = `left:${left + width / 2}px;top:${top + height / 2}px;width:${width * escala}px;height:${height * escala}px;` +
    `border-radius:${getComputedStyle(check).borderRadius}`;
  document.body.appendChild(el);
  return el;
}

function animarESumir(el: HTMLElement, quadros: Keyframe[], opcoes: KeyframeAnimationOptions): void {
  el.animate(quadros, { fill: 'both', ...opcoes }).onfinish = () => el.remove();
}

function aneis(check: HTMLElement, classe: string, escala: number, duracao: number, intervalo: number, quantos = 2): void {
  for (let i = 0; i < quantos; i++) {
    animarESumir(camada(check, classe), [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
      { transform: `translate(-50%, -50%) scale(${escala})`, opacity: 0 },
    ], { duration: duracao, delay: i * intervalo, easing: 'ease-out' });
  }
}

function pulso(check: HTMLElement): void {
  check.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
  aneis(check, 'pulso', 2.2, 650, 140);
}

function ondaDeCalor(check: HTMLElement): void {
  // Uma onda só, suave.
  aneis(check, 'onda-calor', 2.2, 800, 0, 1);
  check.animate(
    [
      { boxShadow: '0 0 0 0 rgb(255 174 0 / 0)' },
      { boxShadow: '0 0 12px 3px rgb(255 120 0 / 0.35)' },
      { boxShadow: '0 0 0 0 rgb(255 174 0 / 0)' },
    ],
    { duration: 800 },
  );
}

function carimbo(check: HTMLElement): void {
  check.animate(
    [
      { transform: 'none' },
      { transform: 'translateY(3px) scale(0.88, 0.82)', offset: 0.35 },
      { transform: 'translateY(-1px) scale(1.04)', offset: 0.65 },
      { transform: 'none' },
    ],
    { duration: 360, easing: 'cubic-bezier(.3,.7,.4,1)' },
  );
  // A linha da série afunda junto com a prensa, como no preview.
  check.closest('.linha, .linha-atual')?.animate(
    [{ transform: 'none' }, { transform: 'translateY(1px)', offset: 0.35 }, { transform: 'none' }],
    { duration: 300 },
  );
  // O reflexo corre numa janela do tamanho do check, com os mesmos cantos, depois da prensa.
  const janela = camada(check, 'reflexo');
  janela.style.transform = 'translate(-50%, -50%)';
  const brilho = document.createElement('span');
  janela.appendChild(brilho);
  brilho.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], {
    duration: 520,
    delay: 220,
    easing: 'ease-in-out',
    fill: 'both',
  }).onfinish = () => janela.remove();
}

/** Commando: um carimbo "SÉRIE OK" cai grande e girado sobre o check, assenta e some; a linha afunda com o golpe. */
function carimboOk(check: HTMLElement): void {
  const { left, top, width, height } = check.getBoundingClientRect();
  const selo = document.createElement('span');
  selo.className = 'efeito-check carimbo-ok';
  selo.textContent = 'SÉRIE OK';
  selo.style.cssText = `left:${left + width / 2}px;top:${top + height / 2}px`;
  document.body.appendChild(selo);
  const girado = 'translate(-50%, -50%) rotate(-14deg)';
  animarESumir(selo, [
    { transform: `${girado} scale(2.4)`, opacity: 0 },
    { transform: `${girado} scale(1)`, opacity: 1, offset: 0.22 },
    { transform: `${girado} scale(1)`, opacity: 1, offset: 0.75 },
    { transform: `${girado} scale(1)`, opacity: 0 },
  ], { duration: 1200, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
  check.closest('.linha, .linha-atual')?.animate(
    [{ transform: 'none' }, { transform: 'translateY(2px)', offset: 0.2 }, { transform: 'none', offset: 0.35 }],
    { duration: 1200 },
  );
}

function falha(check: HTMLElement): void {
  check.animate(
    [{ transform: 'translateX(3px) skewX(-8deg)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px) skewX(6deg)' }, { transform: 'none' }],
    { duration: 360, easing: 'steps(4, end)' },
  );
  // Faixas coloridas deslocadas para lados opostos (o filter seria cortado pelo chanfro do check).
  const faixas: [string, string[], number[]][] = [
    ['rosa', ['inset(15% 0 60% 0)', 'inset(55% 0 20% 0)', 'inset(35% 0 45% 0)'], [-5, 4, -3]],
    ['ciano', ['inset(60% 0 15% 0)', 'inset(10% 0 70% 0)', 'inset(45% 0 30% 0)'], [5, -4, 3]],
  ];
  for (const [cor, cortes, desvios] of faixas) {
    animarESumir(camada(check, `falha ${cor}`), [
      ...cortes.map((c, n) => ({ clipPath: c, transform: `translate(calc(-50% + ${desvios[n]}px), -50%)` })),
      { clipPath: 'inset(100% 0 0 0)', transform: 'translate(-50%, -50%)' },
    ], { duration: 360, easing: 'steps(4, end)' });
  }
}
