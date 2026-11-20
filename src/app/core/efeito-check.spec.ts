import { vi } from 'vitest';
import { efeitoDoCheck } from './efeito-check';

describe('efeitoDoCheck', () => {
  let reduzir: boolean;
  const camadas = (classe: string) => document.querySelectorAll(`.efeito-check.${classe}`).length;
  const check = () => {
    const b = document.createElement('button');
    b.className = 'check ok';
    document.body.appendChild(b);
    return b;
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    reduzir = false;
    vi.stubGlobal('matchMedia', () => ({ matches: reduzir }));
    // O jsdom não tem Web Animations.
    HTMLElement.prototype.animate = vi.fn(() => ({ onfinish: null }) as unknown as Animation);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    delete document.documentElement.dataset['tema'];
  });

  it('escolhe o efeito pelo tema e anima o próprio check', () => {
    const casos: [string, string, number][] = [
      ['ignite', 'onda-calor', 1],
      ['escuro', 'pulso', 2],
      ['claro', 'pulso', 2],
      ['chrome', 'reflexo', 1],
      ['cyberpunk', 'falha', 2],
      ['commando-mata', 'carimbo-ok', 1],
      ['commando-deserto', 'carimbo-ok', 1],
      ['japao-sakura', 'petala', 16],
      ['japao-hokusai', 'onda-hokusai', 1],
      ['japao-sumie', 'hanko', 1],
    ];
    for (const [tema, classe, quantas] of casos) {
      document.body.innerHTML = '';
      document.documentElement.dataset['tema'] = tema;
      const b = check();
      efeitoDoCheck(b);
      expect(camadas(classe), tema).toBe(quantas);
      expect(b.animate, tema).toHaveBeenCalled();
    }
  });

  it('Electric só acende o próprio check, sem camadas no <body>', () => {
    document.documentElement.dataset['tema'] = 'electric';
    const b = check();
    efeitoDoCheck(b);
    expect(document.querySelectorAll('.efeito-check').length).toBe(0);
    expect(b.animate).toHaveBeenCalled();
  });

  it('não faz nada com "reduzir movimento"', () => {
    document.documentElement.dataset['tema'] = 'ignite';
    reduzir = true;
    const b = check();
    efeitoDoCheck(b);
    expect(document.querySelectorAll('.efeito-check').length).toBe(0);
    expect(b.animate).not.toHaveBeenCalled();
  });
});
