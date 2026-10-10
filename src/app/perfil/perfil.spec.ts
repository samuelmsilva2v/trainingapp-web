import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GamificacaoApi, PerfilApi } from '../core/api';
import { Gamificacao } from '../core/modelos';
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
  function abrir() {
    TestBed.configureTestingModule({
      providers: [
        { provide: PerfilApi, useValue: { obter: () => of({ nome: 'Samuel' }), atualizar: () => of({ nome: 'Samuel' }) } },
        { provide: GamificacaoApi, useValue: { resumo: () => of(gamificacao) } },
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

  it('conquistas ficam por último, recolhidas, e abrem no clique', () => {
    const { fixture, tela } = abrir();
    expect([...tela.querySelectorAll('.card')].at(-1)!.classList.contains('conquistas-card')).toBe(true);
    expect(tela.querySelector('.contagem')!.textContent).toBe('1/2');
    expect(tela.querySelectorAll('.conquistas li').length).toBe(0);

    tela.querySelector<HTMLButtonElement>('.conquistas-topo')!.click();
    fixture.detectChanges();

    expect(tela.querySelectorAll('.conquistas li').length).toBe(2);
    expect(tela.querySelector('.conquistas-topo')!.getAttribute('aria-expanded')).toBe('true');
  });
});
