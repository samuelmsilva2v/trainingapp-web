import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthStore } from '../core/auth';
import { Falha } from '../core/falha';
import { NOVA_TENTATIVA_MS, TelaErro } from './tela-erro';

describe('TelaErro', () => {
  let tentativas: number;
  const sair = vi.fn(() => of(undefined));

  function abrir(falha: Falha) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthStore, useValue: { sair } }] });
    const fixture = TestBed.createComponent(TelaErro);
    fixture.componentRef.setInput('falha', falha);
    tentativas = 0;
    fixture.componentInstance.tentar.subscribe(() => tentativas++);
    fixture.detectChanges();
    return fixture;
  }

  const botao = (el: HTMLElement) => el.querySelector('button') as HTMLButtonElement;

  it('mostra ícone, título, frase e o botão do tipo; o código só no erro inesperado', () => {
    const inesperado = abrir({ tipo: 'inesperado', codigo: 500 }).nativeElement as HTMLElement;
    expect(inesperado.textContent).toContain('Erro inesperado');
    expect(inesperado.textContent).toContain('Algo deu errado do nosso lado');
    expect(inesperado.textContent).toContain('Código 500');
    expect(inesperado.querySelector('.icone')?.textContent).toBe('error');

    TestBed.resetTestingModule();
    const semInternet = abrir({ tipo: 'sem-internet', codigo: null }).nativeElement as HTMLElement;
    expect(semInternet.textContent).toContain('Você está sem conexão');
    expect(semInternet.textContent).not.toContain('Código');
    expect(semInternet.querySelector('.icone')?.textContent).toBe('wifi_off');
  });

  it('servidor indisponível tenta de novo sozinho a cada 10 s; o botão também tenta', async () => {
    vi.useFakeTimers();
    try {
      const fixture = abrir({ tipo: 'indisponivel', codigo: null });
      await vi.advanceTimersByTimeAsync(NOVA_TENTATIVA_MS * 2);
      expect(tentativas).toBe(2);
      botao(fixture.nativeElement).click();
      expect(tentativas).toBe(3);
      fixture.destroy();
      await vi.advanceTimersByTimeAsync(NOVA_TENTATIVA_MS * 2);
      expect(tentativas).toBe(3); // destruída, para de tentar
    } finally {
      vi.useRealTimers();
    }
  });

  it('erro inesperado não tenta sozinho', async () => {
    vi.useFakeTimers();
    try {
      abrir({ tipo: 'inesperado', codigo: 500 });
      await vi.advanceTimersByTimeAsync(NOVA_TENTATIVA_MS * 3);
      expect(tentativas).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sem internet tenta de novo quando a rede volta', () => {
    abrir({ tipo: 'sem-internet', codigo: null });
    dispatchEvent(new Event('online'));
    expect(tentativas).toBeGreaterThanOrEqual(1);
  });

  it('acesso restrito: "Entrar com outra conta" sai da conta', () => {
    const el = abrir({ tipo: 'restrito', codigo: null }).nativeElement as HTMLElement;
    expect(botao(el).textContent).toContain('Entrar com outra conta');
    botao(el).click();
    expect(sair).toHaveBeenCalled();
    expect(tentativas).toBe(0);
  });

  it('página não encontrada: "Ir para Hoje" navega para /hoje', () => {
    const el = abrir({ tipo: 'nao-encontrada', codigo: null }).nativeElement as HTMLElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    botao(el).click();
    expect(navegar).toHaveBeenCalledWith('/hoje');
  });
});
