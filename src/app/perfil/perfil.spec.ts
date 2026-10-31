import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthApi, GamificacaoApi, PerfilApi, PesoApi } from '../core/api';
import { AuthStore } from '../core/auth';
import { Gamificacao, Perfil, Peso } from '../core/modelos';
import { PerfilTela } from './perfil';

const gamificacao: Gamificacao = {
  xpTotal: 182, nivel: 1, titulo: 'Iniciante', xpInicioDoNivel: 0, xpProximoNivel: 283, streakAtual: 2, melhorStreak: 2,
  treinos: 2, recordes: 0, treinouHoje: true,
  conquistas: [
    { codigo: 'A', nome: 'Primeiro treino', descricao: 'Conclua seu primeiro treino.', conquistada: true, familia: 'Constância', faixa: 1, progresso: 1, meta: 1 },
    { codigo: 'B', nome: 'Constância', descricao: 'Conclua 10 treinos.', conquistada: false, familia: 'Constância', faixa: 2, progresso: 2, meta: 10 },
    { codigo: 'C', nome: 'Rotina de ferro', descricao: 'Conclua 50 treinos.', conquistada: false, familia: 'Constância', faixa: 3, progresso: 2, meta: 50 },
    { codigo: 'D', nome: 'De volta', descricao: 'Volte a treinar.', conquistada: false, familia: 'De volta', faixa: 1, progresso: 0, meta: 1 },
    { codigo: 'E', nome: 'Evolução ampla', descricao: 'Recordes em 5.', conquistada: true, familia: 'Recordes variados', faixa: 1, progresso: 5, meta: 5 },
    { codigo: 'F', nome: 'Evolução geral', descricao: 'Recordes em 10.', conquistada: true, familia: 'Recordes variados', faixa: 2, progresso: 10, meta: 10 },
  ],
};

describe('PerfilTela', () => {
  const excluirConta = vi.fn(() => of(undefined));
  const atualizar = vi.fn((p: Partial<Perfil>) => of({ nome: 'Samuel', email: 'samuel@teste.com', temSenha: false, lembretePesoDias: null, ...p }));

  function abrir(perfil: Partial<Perfil> = {}, config = { googleClientId: '' }, pesos: Peso[] = []) {
    atualizar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PerfilApi, useValue: { obter: () => of({ nome: 'Samuel', email: 'samuel@teste.com', temSenha: false, ...perfil }), atualizar } },
        { provide: PesoApi, useValue: { listar: () => of(pesos) } },
        { provide: GamificacaoApi, useValue: { resumo: () => of(gamificacao) } },
        { provide: AuthApi, useValue: { config: () => of(config) } },
        { provide: AuthStore, useValue: { excluirConta, sair: () => of(undefined) } },
      ],
    });
    const fixture = TestBed.createComponent(PerfilTela);
    fixture.detectChanges();
    return { fixture, tela: fixture.nativeElement as HTMLElement };
  }

  it('card do usuário: nome, título padrão, sequência, nível e XP; sem fuso horário', () => {
    const { tela } = abrir();
    const texto = tela.textContent ?? '';

    expect(tela.querySelector('.nome')!.textContent).toBe('Samuel');
    expect(texto).toContain('Praticante de musculação');
    expect(texto).toContain('2 dias');
    expect(texto).toContain('Nível 1 · Iniciante');
    expect(texto).toContain('182 / 283 XP');
    expect(texto).not.toContain('Fuso');
    expect(tela.querySelector('select')).toBeNull();
  });

  it('desafios da semana: progresso, cumprido e quantos dias faltam', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 12)); // quarta 28/10
    try {
      gamificacao.desafios = [
        { codigo: 'TRES_TREINOS', nome: '3 treinos na semana', progresso: 3, meta: 3, xp: 50, cumprido: true },
        { codigo: 'UM_RECORDE', nome: 'Bater 1 recorde', progresso: 0, meta: 1, xp: 30, cumprido: false },
      ];
      gamificacao.semanaTerminaEm = '2026-11-01';
      const { tela } = abrir();
      const cartao = tela.querySelector('.desafios-card')!;
      expect(cartao.textContent).toContain('Desafios da semana');
      expect(cartao.textContent).toContain('Faltam 4 dias');
      expect(cartao.textContent).toContain('3/3 · +50 XP');
      expect(cartao.textContent).toContain('0/1 · +30 XP');
      expect(cartao.querySelectorAll('li.cumprido').length).toBe(1);
    } finally {
      delete gamificacao.desafios;
      delete gamificacao.semanaTerminaEm;
      vi.useRealTimers();
    }
  });

  it('o card da conta (com o Sair) fica por último, logo depois das conquistas, sem "sair de todos"', () => {
    const { tela } = abrir();
    const cards = [...tela.querySelectorAll('.card')];

    expect(cards.at(-1)!.getAttribute('aria-label')).toBe('Conta');
    expect(cards.at(-2)!.classList.contains('conquistas-card')).toBe(true);
    expect([...cards.at(-1)!.querySelectorAll('button')].map(b => b.textContent!.trim())).toEqual(['Excluir conta e apagar dados', 'Sair']);
    expect(tela.textContent).not.toContain('todos os aparelhos');
  });

  it('conquistas ficam recolhidas e abrem no clique, uma linha por família', () => {
    const { fixture, tela } = abrir();
    expect(tela.querySelector('.contagem')!.textContent).toBe('3/6');
    expect(tela.querySelectorAll('.familia').length).toBe(0);

    tela.querySelector<HTMLButtonElement>('.conquistas-topo')!.click();
    fixture.detectChanges();

    expect(tela.querySelector('.conquistas-topo')!.getAttribute('aria-expanded')).toBe('true');
    const linhas = [...tela.querySelectorAll('.familia')];
    expect(linhas.length).toBe(3);
    // Constância: a próxima faixa em destaque, bolinhas e barra com a unidade.
    expect(linhas[0].textContent).toContain('Constância');
    expect(linhas[0].querySelector('.nome-conquista')!.textContent).toContain('Constância');
    expect(linhas[0].querySelectorAll('.bolinha').length).toBe(3);
    expect(linhas[0].querySelectorAll('.bolinha.cheia').length).toBe(1);
    expect(linhas[0].querySelector('.bolinha')!.getAttribute('aria-label')).toBe('Faixa 1 de 3, conquistada');
    expect(linhas[0].textContent).toContain('2/10 treinos');
    expect(linhas[0].querySelector('[role=progressbar]')!.getAttribute('aria-valuemax')).toBe('10');
    // Faixa única: cadeado, sem barra. Família completa: selo.
    expect(linhas[1].querySelector('[role=progressbar]')).toBeNull();
    expect(linhas[1].querySelector('.icone.unica')!.textContent).toBe('lock');
    expect(linhas[2].querySelector('.selo-completa')!.textContent).toContain('Completa');
  });

  it('tocar na família lista as faixas com a meta e o check nas conquistadas', () => {
    const { fixture, tela } = abrir();
    tela.querySelector<HTMLButtonElement>('.conquistas-topo')!.click();
    fixture.detectChanges();
    const topo = tela.querySelector<HTMLButtonElement>('.familia button.familia-topo')!;
    topo.click();
    fixture.detectChanges();

    expect(topo.getAttribute('aria-expanded')).toBe('true');
    const faixas = [...tela.querySelectorAll('.faixas li')];
    expect(faixas.length).toBe(3);
    expect(faixas[0].textContent).toContain('Primeiro treino · 1 treinos');
    expect(faixas[2].textContent).toContain('Rotina de ferro · 50 treinos');
    expect(faixas[0].classList).toContain('ganha');
  });

  it('Excluir conta e apagar dados fica logo acima do Sair, depois de Trocar senha', () => {
    const { tela } = abrir({ temSenha: true });
    const botoes = [...tela.querySelectorAll('[aria-label="Conta"] button')].map(b => b.textContent!.trim());

    expect(botoes).toEqual(['Trocar senha', 'Excluir conta e apagar dados', 'Sair']);
  });

  it('excluir com senha: pede confirmação com aviso, só habilita com a senha e manda a senha à API', () => {
    excluirConta.mockClear();
    const { fixture, tela } = abrir({ temSenha: true });
    tela.querySelector<HTMLButtonElement>('.acao.perigo')!.click();
    fixture.detectChanges();

    expect(tela.querySelector('.exclusao')!.textContent).toContain('Não dá para desfazer');
    expect(tela.querySelector('.acao.perigo')).toBeNull(); // a confirmação ocupa o lugar do botão
    const confirmar = tela.querySelector<HTMLButtonElement>('.btn-excluir')!;
    expect(confirmar.disabled).toBe(true);

    const campo = tela.querySelector<HTMLInputElement>('.exclusao input')!;
    campo.value = 'minha-senha';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmar.disabled).toBe(false);
    tela.querySelector('.exclusao form')!.dispatchEvent(new Event('submit'));

    expect(excluirConta).toHaveBeenCalledWith({ senha: 'minha-senha' });
  });

  it('cancelar a exclusão fecha a confirmação sem apagar nada', () => {
    excluirConta.mockClear();
    const { fixture, tela } = abrir({ temSenha: true });
    tela.querySelector<HTMLButtonElement>('.acao.perigo')!.click();
    fixture.detectChanges();

    [...tela.querySelectorAll<HTMLButtonElement>('.exclusao button')].find(b => b.textContent!.includes('Cancelar'))!.click();
    fixture.detectChanges();

    expect(tela.querySelector('.exclusao')).toBeNull();
    expect(tela.querySelector('.acao.perigo')).not.toBeNull();
    expect(excluirConta).not.toHaveBeenCalled();
  });

  it('conta só do Google: confirma pelo popup do Google e manda o código à API', async () => {
    excluirConta.mockClear();
    // O script do Google não carrega no teste: o carregador recebe um onload simulado e um window.google falso.
    let configuracao!: { callback: (r: { code?: string }) => void };
    const requestCode = vi.fn();
    (window as unknown as { google: unknown }).google = {
      accounts: { oauth2: { initCodeClient: (c: typeof configuracao) => ((configuracao = c), { requestCode }) } },
    };
    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(no: T): T => {
      setTimeout(() => (no as unknown as HTMLScriptElement).onload?.(new Event('load')));
      return no;
    });

    const { fixture, tela } = abrir({ temSenha: false }, { googleClientId: 'cliente.apps.googleusercontent.com' });
    tela.querySelector<HTMLButtonElement>('.acao.perigo')!.click();
    fixture.detectChanges();
    expect(tela.querySelector('.exclusao input')).toBeNull(); // sem senha para digitar
    const confirmar = tela.querySelector<HTMLButtonElement>('.btn-excluir')!;
    expect(confirmar.disabled).toBe(true); // o popup ainda está carregando

    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();
    expect(confirmar.disabled).toBe(false);
    confirmar.click();
    expect(requestCode).toHaveBeenCalledTimes(1);

    configuracao.callback({ code: 'codigo-do-popup' });
    expect(excluirConta).toHaveBeenCalledWith({ codigo: 'codigo-do-popup' });
  });
});

describe('PerfilTela: peso', () => {
  const atualizar = vi.fn((p: Partial<Perfil>) => of({ nome: 'Samuel', email: 's@t.com', temSenha: true, lembretePesoDias: null, ...p }));

  function abrir(perfil: Partial<Perfil>, pesos: Peso[]) {
    atualizar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PerfilApi, useValue: { obter: () => of({ nome: 'Samuel', email: 's@t.com', temSenha: true, lembretePesoDias: null, ...perfil }), atualizar } },
        { provide: PesoApi, useValue: { listar: () => of(pesos) } },
        { provide: GamificacaoApi, useValue: { resumo: () => of(gamificacao) } },
        { provide: AuthApi, useValue: { config: () => of({ googleClientId: '' }) } },
        { provide: AuthStore, useValue: { excluirConta: () => of(undefined), sair: () => of(undefined) } },
      ],
    });
    const fixture = TestBed.createComponent(PerfilTela);
    fixture.detectChanges();
    return { fixture, tela: fixture.nativeElement as HTMLElement };
  }

  const hoje = new Date();
  const dia = (atras: number) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - atras);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const preferencias = (tela: HTMLElement) => tela.querySelector('[aria-label="Preferências"]')!;
  const interruptorPeso = (tela: HTMLElement) =>
    [...preferencias(tela).querySelectorAll<HTMLLabelElement>('.alternar')].find(l => l.textContent!.includes('Lembrete de pesagem'))!
      .querySelector<HTMLInputElement>('input')!;

  it('Dados pessoais tem o nome e o peso; Preferências tem o tema e as notificações', () => {
    const { tela } = abrir({}, []);
    const dados = tela.querySelector('[aria-label="Dados pessoais"]')!;

    expect(dados.querySelector('input[autocomplete="name"]')).not.toBeNull();
    expect(dados.querySelector('[aria-labelledby="titulo-peso"]')!.textContent).toContain('Nenhuma pesagem ainda');
    expect(dados.textContent).not.toContain('Lembrete');
    expect(preferencias(tela).textContent).toContain('Tema do aplicativo');
    expect(preferencias(tela).textContent).toContain('Notificações');
    expect(preferencias(tela).querySelector('input[autocomplete="name"]')).toBeNull();
  });

  it('lembrete de pesagem desligado não mostra a frequência; ligar salva com 7 dias', () => {
    const { fixture, tela } = abrir({}, []);
    expect(interruptorPeso(tela).checked).toBe(false);
    expect(preferencias(tela).querySelector('.frequencias')).toBeNull();

    interruptorPeso(tela).click();
    fixture.detectChanges();

    expect(atualizar).toHaveBeenCalledWith({ nome: 'Samuel', lembretePesoDias: 7 });
    expect(preferencias(tela).querySelector('.frequencias [aria-pressed="true"]')!.textContent!.trim()).toBe('7 dias');
  });

  it('desligar o lembrete de pesagem salva null', () => {
    const { tela } = abrir({ lembretePesoDias: 15 }, []);
    interruptorPeso(tela).click();

    expect(atualizar).toHaveBeenCalledWith({ nome: 'Samuel', lembretePesoDias: null });
  });

  it('mostra o último peso, a variação e o gráfico', () => {
    const { tela } = abrir({}, [{ data: dia(3), kg: 81 }, { data: dia(0), kg: 80 }]);
    const secao = tela.querySelector('[aria-labelledby="titulo-peso"]')!;
    const texto = secao.textContent!;

    expect(texto).toContain('80 kg');
    expect(texto).toContain('−1,0 kg');
    expect(texto).not.toContain('IMC');
    expect(secao.querySelectorAll('svg circle').length).toBe(2);
    expect(secao.querySelector('svg polyline')).not.toBeNull();
  });

  it('a linha principal passa pelos pontos; com menos de 5 pesagens não há tendência', () => {
    const { tela } = abrir({}, [{ data: dia(9), kg: 77.4 }, { data: dia(5), kg: 78.4 }, { data: dia(0), kg: 80.2 }]);
    const secao = tela.querySelector('[aria-labelledby="titulo-peso"]')!;
    const pontos = [...secao.querySelectorAll('svg circle')].map(c => `${Number(c.getAttribute('cx')).toFixed(1)},${Number(c.getAttribute('cy')).toFixed(1)}`);

    expect(secao.querySelector('.linha-pesos')!.getAttribute('points')).toBe(pontos.join(' '));
    expect(secao.querySelector('.tendencia')).toBeNull();
    expect(secao.textContent).not.toContain('Tendência');
    // Eixo em kg inteiros, de 77 a 81.
    expect([...secao.querySelectorAll('svg .rotulo-eixo.num')].map(t => t.textContent)).toEqual(['81', '79', '77']);
  });

  it('a lista mostra as 5 mais recentes e o "Mostrar mais" abre mais 5', () => {
    const pesos = Array.from({ length: 12 }, (_, i) => ({ data: dia(11 - i), kg: 80 }));
    const { fixture, tela } = abrir({}, pesos);
    tela.querySelector<HTMLButtonElement>('.lista-topo')!.click();
    fixture.detectChanges();
    const mais = () => tela.querySelector<HTMLButtonElement>('.mais');

    expect(tela.querySelectorAll('.pesos li').length).toBe(5);
    expect(mais()!.textContent).toContain('7 restantes');
    mais()!.click();
    fixture.detectChanges();
    expect(tela.querySelectorAll('.pesos li').length).toBe(10);
    mais()!.click();
    fixture.detectChanges();
    expect(tela.querySelectorAll('.pesos li').length).toBe(12);
    expect(mais()).toBeNull();
  });

  it('com 5 pesagens ou mais, a tendência aparece tracejada e no resumo', () => {
    const pesos = [9, 7, 5, 3, 0].map((atras, i) => ({ data: dia(atras), kg: 80 + i * 0.3 }));
    const { tela } = abrir({}, pesos);
    const secao = tela.querySelector('[aria-labelledby="titulo-peso"]')!;

    expect(secao.querySelector('.tendencia')).not.toBeNull();
    expect(secao.textContent).toContain('Tendência');
  });

  it('salvar o nome manda junto o lembrete atual', () => {
    const { fixture, tela } = abrir({ lembretePesoDias: 15 }, []);
    const campo = tela.querySelector<HTMLInputElement>('input[autocomplete="name"]')!;
    campo.value = 'Sam';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tela.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(atualizar).toHaveBeenCalledWith({ nome: 'Sam', lembretePesoDias: 15 });
  });

  it('escolher a frequência do lembrete salva na hora', () => {
    const { fixture, tela } = abrir({ lembretePesoDias: 7 }, []);
    const opcoes = [...preferencias(tela).querySelectorAll<HTMLButtonElement>('.frequencias button')];
    opcoes.find(b => b.textContent!.trim() === '15 dias')!.click();
    fixture.detectChanges();

    expect(atualizar).toHaveBeenCalledWith({ nome: 'Samuel', lembretePesoDias: 15 });
    expect(opcoes.find(b => b.getAttribute('aria-pressed') === 'true')!.textContent!.trim()).toBe('15 dias');
  });
});
