import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { lerLembrete } from '../core/lembrete';
import { ConfiguracoesTela } from './configuracoes';
import { OpcoesTreino } from './opcoes-treino';

describe('ConfiguracoesTela', () => {
  const navigate = vi.fn(() => Promise.resolve(true));

  function abrir() {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    const fixture = TestBed.createComponent(ConfiguracoesTela);
    fixture.detectChanges();
    const opcoes = fixture.debugElement.query(e => e.componentInstance instanceof OpcoesTreino).componentInstance;
    return { fixture, tela: fixture.componentInstance as unknown as { voltar(): void }, opcoes: opcoes as { mudarHora(h: string): void } };
  }

  it('mostra o passo da carga e salvar no plano', () => {
    const texto = (abrir().fixture.nativeElement as HTMLElement).textContent!;
    expect(texto).toContain('Passo da carga');
    expect(texto).toContain('Salvar mudanças do treino no plano');
  });

  it('na web não mostra as notificações, que são só do app', () => {
    const { fixture } = abrir();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Lembrete de treino');
  });

  it('horário do lembrete: guarda "HH:MM" e ignora o que não for horário', () => {
    const { opcoes } = abrir();
    opcoes.mudarHora('06:45');
    expect(lerLembrete().hora).toBe('06:45');
    opcoes.mudarHora('');
    expect(lerLembrete().hora).toBe('06:45');
  });

  it('voltar leva ao Perfil', () => {
    const { tela } = abrir();
    tela.voltar();
    expect(navigate).toHaveBeenCalledWith(['/perfil']);
  });
});
