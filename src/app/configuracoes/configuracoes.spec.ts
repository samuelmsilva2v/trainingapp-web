import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { lerLembrete } from '../core/lembrete';
import { ConfiguracoesTela } from './configuracoes';

describe('ConfiguracoesTela', () => {
  const navigate = vi.fn(() => Promise.resolve(true));

  function abrir() {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    const fixture = TestBed.createComponent(ConfiguracoesTela);
    fixture.detectChanges();
    return { fixture, tela: fixture.componentInstance as unknown as { mudarHora(h: string): void; voltar(): void } };
  }

  it('na web não mostra as notificações, que são só do app', () => {
    const { fixture } = abrir();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Lembrete de treino');
  });

  it('horário do lembrete: guarda "HH:MM" e ignora o que não for horário', () => {
    const { tela } = abrir();
    tela.mudarHora('06:45');
    expect(lerLembrete().hora).toBe('06:45');
    tela.mudarHora('');
    expect(lerLembrete().hora).toBe('06:45');
  });

  it('voltar leva ao Perfil', () => {
    const { tela } = abrir();
    tela.voltar();
    expect(navigate).toHaveBeenCalledWith(['/perfil']);
  });
});
