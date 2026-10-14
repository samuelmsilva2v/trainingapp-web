import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { App } from '@capacitor/app';
import { vi } from 'vitest';
import { IntegracaoAndroid } from './android';

vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), exitApp: vi.fn() } }));

describe('voltar do Android', () => {
  let integracao: IntegracaoAndroid;
  let router: Router;
  const dialogos: { close: () => void }[] = [];

  beforeEach(() => {
    dialogos.length = 0;
    vi.mocked(App.exitApp).mockClear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MatDialog, useValue: { openDialogs: dialogos } }],
    });
    integracao = TestBed.inject(IntegracaoAndroid);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  const em = (url: string) => vi.spyOn(router, 'url', 'get').mockReturnValue(url);

  it('fecha o diálogo aberto antes de tudo', () => {
    em('/hoje');
    const fechar = vi.fn();
    dialogos.push({ close: fechar });
    integracao.voltar(true);
    expect(fechar).toHaveBeenCalled();
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('nas telas iniciais fecha o app; nas outras abas vai para Hoje', () => {
    em('/hoje');
    integracao.voltar(true);
    expect(App.exitApp).toHaveBeenCalledTimes(1);

    em('/entrar?x=1');
    integracao.voltar(false);
    expect(App.exitApp).toHaveBeenCalledTimes(2);

    em('/historico');
    integracao.voltar(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/hoje');
  });

  it('numa tela interna volta uma tela; sem histórico, vai para Hoje', () => {
    const voltar = vi.spyOn(history, 'back').mockImplementation(() => undefined);
    em('/treino');
    integracao.voltar(true);
    expect(voltar).toHaveBeenCalled();

    em('/planos/123');
    integracao.voltar(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/hoje');
    expect(App.exitApp).not.toHaveBeenCalled();
  });
});
