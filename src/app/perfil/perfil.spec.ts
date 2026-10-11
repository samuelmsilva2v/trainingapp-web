import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthApi, GamificacaoApi, PerfilApi } from '../core/api';
import { AuthStore } from '../core/auth';
import { Gamificacao, Perfil } from '../core/modelos';
import { PerfilTela } from './perfil';

const gamificacao: Gamificacao = {
  xpTotal: 182, nivel: 1, xpInicioDoNivel: 0, xpProximoNivel: 283, streakAtual: 2, melhorStreak: 2,
  treinos: 2, recordes: 0, treinouHoje: true,
  conquistas: [
    { codigo: 'A', nome: 'Primeiro treino', descricao: 'Conclua seu primeiro treino.', conquistada: true },
    { codigo: 'B', nome: 'Constância', descricao: 'Conclua 10 treinos.', conquistada: false },
  ],
};

describe('PerfilTela', () => {
  const excluirConta = vi.fn(() => of(undefined));

  function abrir(perfil: Partial<Perfil> = {}, config = { googleClientId: '' }) {
    TestBed.configureTestingModule({
      providers: [
        { provide: PerfilApi, useValue: { obter: () => of({ nome: 'Samuel', email: 'samuel@teste.com', temSenha: false, ...perfil }), atualizar: () => of({ nome: 'Samuel' }) } },
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
    expect(texto).toContain('Nível 1');
    expect(texto).toContain('182 / 283 XP');
    expect(texto).not.toContain('Fuso');
    expect(tela.querySelector('select')).toBeNull();
  });

  it('o card da conta (com o Sair) fica por último, logo depois das conquistas, sem "sair de todos"', () => {
    const { tela } = abrir();
    const cards = [...tela.querySelectorAll('.card')];

    expect(cards.at(-1)!.getAttribute('aria-label')).toBe('Conta');
    expect(cards.at(-2)!.classList.contains('conquistas-card')).toBe(true);
    expect([...cards.at(-1)!.querySelectorAll('button')].map(b => b.textContent!.trim())).toEqual(['Excluir conta e apagar dados', 'Sair']);
    expect(tela.textContent).not.toContain('todos os aparelhos');
  });

  it('conquistas ficam recolhidas e abrem no clique', () => {
    const { fixture, tela } = abrir();
    expect(tela.querySelector('.contagem')!.textContent).toBe('1/2');
    expect(tela.querySelectorAll('.conquistas li').length).toBe(0);

    tela.querySelector<HTMLButtonElement>('.conquistas-topo')!.click();
    fixture.detectChanges();

    expect(tela.querySelectorAll('.conquistas li').length).toBe(2);
    expect(tela.querySelector('.conquistas-topo')!.getAttribute('aria-expanded')).toBe('true');
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
