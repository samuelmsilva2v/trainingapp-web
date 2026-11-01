import { vi } from 'vitest';
import { iniciarTema, lerTema, salvarTema } from './tema';

describe('tema', () => {
  let sistemaEscuro: boolean;
  let avisarTroca: () => void;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['tema'];
    document.head.innerHTML = '<meta name="theme-color" content="#121416">';
    sistemaEscuro = true;
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return sistemaEscuro; },
      addEventListener: (_: string, ouvinte: () => void) => (avisarTroca = ouvinte),
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  const corDaBarra = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

  it('sem escolha guardada começa no escuro', () => {
    iniciarTema();
    expect(lerTema()).toBe('escuro');
    expect(document.documentElement.dataset['tema']).toBe('escuro');
    expect(corDaBarra()).toBe('#121416');
  });

  it('aplica na inicialização o tema guardado, e valor estranho volta ao padrão', () => {
    localStorage.setItem('trainingapp.tema', 'claro');
    iniciarTema();
    expect(document.documentElement.dataset['tema']).toBe('claro');
    expect(corDaBarra()).toBe('#f4f5f2');

    localStorage.setItem('trainingapp.tema', 'roxo');
    expect(lerTema()).toBe('escuro');
  });

  it('"Sistema" segue o aparelho, inclusive quando ele troca de tema com o app aberto', () => {
    localStorage.setItem('trainingapp.tema', 'sistema');
    sistemaEscuro = false;
    iniciarTema();
    expect(document.documentElement.dataset['tema']).toBe('sistema');
    expect(corDaBarra()).toBe('#f4f5f2');

    sistemaEscuro = true;
    avisarTroca();
    expect(corDaBarra()).toBe('#121416');
  });

  it('escolher guarda no aparelho e já aplica', () => {
    iniciarTema();
    salvarTema('claro');
    expect(localStorage.getItem('trainingapp.tema')).toBe('claro');
    expect(document.documentElement.dataset['tema']).toBe('claro');
  });
});
