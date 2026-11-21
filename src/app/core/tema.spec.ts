import { aplicarTemaDaConta, conferirTema, gravandoTema, iniciarTema, lerTema, proximoTema, salvarTema, temasLiberados, xpDoNivel } from './tema';

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['tema'];
    document.head.innerHTML = '<meta name="theme-color" content="#121416">';
  });

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

  it('quem tinha "Sistema" guardado (opção removida) volta ao escuro', () => {
    localStorage.setItem('trainingapp.tema', 'sistema');
    iniciarTema();
    expect(document.documentElement.dataset['tema']).toBe('escuro');
    expect(corDaBarra()).toBe('#121416');
  });

  it('escolher guarda no aparelho e já aplica', () => {
    iniciarTema();
    salvarTema('claro');
    expect(localStorage.getItem('trainingapp.tema')).toBe('claro');
    expect(document.documentElement.dataset['tema']).toBe('claro');
  });

  it('Ignite é escuro com o fundo próprio na barra', () => {
    salvarTema('ignite');
    expect(lerTema()).toBe('ignite');
    expect(corDaBarra()).toBe('#0b0c10');
  });

  it('Chrome é escuro com o fundo próprio na barra', () => {
    salvarTema('chrome');
    expect(lerTema()).toBe('chrome');
    expect(corDaBarra()).toBe('#151617');
  });

  it('Electric é escuro com o fundo próprio na barra', () => {
    salvarTema('electric');
    expect(lerTema()).toBe('electric');
    expect(corDaBarra()).toBe('#0e0c1a');
  });

  it('Cyberpunk é escuro com o fundo próprio na barra', () => {
    salvarTema('cyberpunk');
    expect(lerTema()).toBe('cyberpunk');
    expect(corDaBarra()).toBe('#0b1026');
  });

  it('cada camuflagem do Commando é um tema guardado, com o fundo próprio na barra', () => {
    salvarTema('commando-deserto');
    expect(lerTema()).toBe('commando-deserto');
    expect(document.documentElement.dataset['tema']).toBe('commando-deserto');
    expect(corDaBarra()).toBe('#3b3427');
  });

  it('as variantes do Japan são temas guardados; o Sumi-e tem fundo claro na barra', () => {
    salvarTema('japao-hokusai');
    expect(lerTema()).toBe('japao-hokusai');
    expect(corDaBarra()).toBe('#0c1828');
    salvarTema('japao-sumie');
    expect(corDaBarra()).toBe('#efe8da');
  });

  it('tema guardado acima do nível da conta volta ao padrão; liberado ou sem trava fica', () => {
    salvarTema('ignite'); // nível 15
    expect(conferirTema(15)).toBe('ignite');
    expect(conferirTema(4)).toBe('escuro');
    expect(localStorage.getItem('trainingapp.tema')).toBe('escuro');
    expect(document.documentElement.dataset['tema']).toBe('escuro');

    salvarTema('claro');
    expect(conferirTema(1)).toBe('claro');
  });

  it('tema da conta vence o do aparelho; conta sem tema ou com valor estranho mantém o do aparelho', () => {
    salvarTema('claro');
    expect(aplicarTemaDaConta('chrome')).toBe('chrome');
    expect(localStorage.getItem('trainingapp.tema')).toBe('chrome');
    expect(aplicarTemaDaConta(null)).toBe('chrome');
    expect(aplicarTemaDaConta('rosa')).toBe('chrome');
  });

  it('com a gravação do tema em andamento, o tema que vem da conta não desfaz a escolha', () => {
    salvarTema('claro');
    gravandoTema(true);
    expect(aplicarTemaDaConta('escuro')).toBe('claro');
    gravandoTema(false);
    expect(aplicarTemaDaConta('escuro')).toBe('escuro');
  });

  it('XP do nível espelha a API (100 × n^1,5 para cima)', () => {
    expect(xpDoNivel(1)).toBe(100);
    expect(xpDoNivel(5)).toBe(1119);
    expect(xpDoNivel(20)).toBe(8945);
  });

  it('próximo tema: o primeiro ainda travado, com o XP que falta e a barra desde o último liberado', () => {
    // Nível 4 com 1.048 XP: nada liberado além dos livres, o Chrome (nível 5) é o próximo.
    expect(proximoTema(4, 1048)).toEqual({ tema: 'chrome', nivel: 5, faltam: 71, fracao: 1048 / 1119 });
    // Nível 12: Electric (10) foi o último; Ignite (15) é o próximo, a barra conta a partir do XP do nível 10.
    const p = proximoTema(12, 4500)!;
    expect(p.tema).toBe('ignite');
    expect(p.faltam).toBe(xpDoNivel(15) - 4500);
    expect(p.fracao).toBeCloseTo((4500 - xpDoNivel(10)) / (xpDoNivel(15) - xpDoNivel(10)));
    // Commando Mata e Deserto liberam juntos: depois deles vem o Cyberpunk.
    expect(proximoTema(20, 9000)!.tema).toBe('cyberpunk');
    expect(proximoTema(30, 20000)).toBeNull();
  });

  it('conta os temas liberados um a um (Commando e Japan valem cada variante)', () => {
    expect(temasLiberados(1)).toBe(2);
    expect(temasLiberados(20)).toBe(7);
    expect(temasLiberados(30)).toBe(11);
  });
});
