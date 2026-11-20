/**
 * Efeito ao concluir uma série, um por tema (nada com "reduzir movimento" ou sem Web Animations):
 * - Escuro e Claro: pulso, um anel da cor principal que se expande a partir do check.
 * - Ignite: onda de calor, duas ondas laranja e o botão brilhando.
 * - Chrome: carimbo, o check desce como uma prensa e um reflexo prateado passa por ele.
 * - Electric: flash, o check acende claro e solta um brilho lilás.
 * - Cyberpunk: falha, tranco com faixas rosa e ciano deslocadas antes de assentar.
 * - Commando (as duas camuflagens): carimbo "SÉRIE OK" sobre o check.
 * - Japan: Sakura solta pétalas, Hokusai a onda do Ignite em azul e Sumi-e bate o carimbo 済.
 * Recebe o check já no lugar final (o Treino chama depois de redesenhar a tela). Anéis, reflexo e faixas
 * ficam no <body> com `position: fixed`, para não serem cortados pelo card nem pelo chanfro do check.
 */
export function efeitoDoCheck(check: HTMLElement): void {
  if (matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!check.animate) return;
  // Efeito da variante (Japan) ou do grupo inteiro (as camuflagens do Commando dividem o mesmo).
  const tema = document.documentElement.dataset['tema'] ?? '';
  (EFEITOS[tema] ?? EFEITOS[tema.split('-')[0]] ?? pulso)(check);
}

/** Efeito de cada tema; os que não estão aqui (Escuro e Claro) usam o pulso. */
const EFEITOS: Record<string, (check: HTMLElement) => void> = {
  ignite: ondaDeCalor,
  chrome: carimbo,
  electric: flashEletrico,
  cyberpunk: falha,
  commando: carimboOk,
  'japao-sakura': petalas,
  'japao-hokusai': ondaHokusai,
  'japao-sumie': hanko,
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

/** Uma onda só, suave, e o check brilhando na cor dada (Ignite em laranja, Hokusai em azul). */
function onda(check: HTMLElement, classe: string, brilho: string): void {
  aneis(check, classe, 2.2, 800, 0, 1);
  check.animate(
    [
      { boxShadow: `0 0 0 0 rgb(${brilho} / 0)` },
      { boxShadow: `0 0 12px 3px rgb(${brilho} / 0.35)` },
      { boxShadow: `0 0 0 0 rgb(${brilho} / 0)` },
    ],
    { duration: 800 },
  );
}

/** Electric: só o flash, o check acende claro e solta o brilho lilás, sem camadas extras. */
function flashEletrico(check: HTMLElement): void {
  check.animate(
    [
      { boxShadow: '0 0 0 0 rgb(185 168 255 / 0)', filter: 'brightness(1)' },
      { boxShadow: '0 0 22px 6px rgb(185 168 255 / 0.85)', filter: 'brightness(1.8)', offset: 0.15 },
      { boxShadow: '0 0 0 0 rgb(185 168 255 / 0)', filter: 'brightness(1)' },
    ],
    { duration: 550, easing: 'ease-out' },
  );
}

// Declarações de função (não const): o EFEITOS lá em cima as usa antes desta linha.
function ondaDeCalor(check: HTMLElement): void {
  onda(check, 'onda-calor', '255 120 0');
}
function ondaHokusai(check: HTMLElement): void {
  onda(check, 'onda-hokusai', '143 184 220');
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

const entre = (a: number, b: number) => a + Math.random() * (b - a);

/** Partícula solta no <body>, centrada no check, com o estilo extra dado. */
function particula(check: HTMLElement, classe: string, css = ''): HTMLElement {
  const { left, top, width, height } = check.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = `efeito-check ${classe}`;
  el.style.cssText = `left:${left + width / 2}px;top:${top + height / 2}px;${css}`;
  document.body.appendChild(el);
  return el;
}

/** Sakura: rajada de pétalas que giram e caem. */
function petalas(check: HTMLElement): void {
  for (let i = 0; i < 16; i++) {
    const angulo = entre(0, Math.PI * 2);
    const dist = entre(30, 90);
    animarESumir(particula(check, 'petala'), [
      { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(angulo) * dist}px), calc(-50% + ${Math.sin(angulo) * dist + 30}px)) rotate(${entre(180, 540)}deg)`, opacity: 0 },
    ], { duration: entre(900, 1400), easing: 'cubic-bezier(.2,.7,.4,1)' });
  }
}


/** Sumi-e: o carimbo vermelho 済 ("feito") cai girado sobre o check, assenta e some. */
function hanko(check: HTMLElement): void {
  const selo = particula(check, 'hanko');
  selo.textContent = '済';
  const girado = 'translate(-50%, -50%) rotate(-8deg)';
  animarESumir(selo, [
    { transform: `${girado} scale(1.8)`, opacity: 0 },
    { transform: `${girado} scale(0.95)`, opacity: 1, offset: 0.2 },
    { transform: `${girado} scale(1)`, opacity: 1, offset: 0.75 },
    { transform: `${girado} scale(1)`, opacity: 0 },
  ], { duration: 1300, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
}
