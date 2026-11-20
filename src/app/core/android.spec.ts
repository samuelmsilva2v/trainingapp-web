import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { IntegracaoAndroid, avisoDescansoLigado, compartilharLink, salvarAvisoDescanso } from './android';

describe('voltar do Android', () => {
  let integracao: IntegracaoAndroid;
  let router: Router;
  let fecharApp: ReturnType<typeof vi.fn<() => void>>;
  const dialogos: { close: () => void; componentInstance?: unknown }[] = [];

  beforeEach(() => {
    dialogos.length = 0;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MatDialog, useValue: { openDialogs: dialogos } }],
    });
    integracao = TestBed.inject(IntegracaoAndroid);
    fecharApp = vi.fn<() => void>();
    integracao.fecharApp = fecharApp;
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
    expect(fecharApp).not.toHaveBeenCalled();
  });

  it('diálogo com regra própria (aoVoltar) decide como fechar', () => {
    em('/planos/1');
    const fechar = vi.fn();
    const aoVoltar = vi.fn();
    dialogos.push({ close: fechar, componentInstance: { aoVoltar } });
    integracao.voltar(true);
    expect(aoVoltar).toHaveBeenCalled();
    expect(fechar).not.toHaveBeenCalled();
  });

  it('nas telas iniciais fecha o app; nas outras abas vai para Hoje', () => {
    em('/hoje');
    integracao.voltar(true);
    expect(fecharApp).toHaveBeenCalledTimes(1);

    em('/entrar?x=1');
    integracao.voltar(false);
    expect(fecharApp).toHaveBeenCalledTimes(2);

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
    expect(fecharApp).not.toHaveBeenCalled();
  });
});

describe('aviso de fim do descanso', () => {
  afterEach(() => localStorage.removeItem('trainingapp.avisoDescanso'));

  it('vem ligado e a escolha fica guardada no aparelho', () => {
    expect(avisoDescansoLigado()).toBe(true);
    salvarAvisoDescanso(false);
    expect(avisoDescansoLigado()).toBe(false);
    salvarAvisoDescanso(true);
    expect(avisoDescansoLigado()).toBe(true);
  });
});

describe('compartilharLink na web', () => {
  let copiado: string | null;

  beforeEach(() => {
    copiado = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void (copiado = t) } });
  });
  afterEach(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));

  it('sem Web Share copia o link', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    expect(await compartilharLink('Plano', 'https://x/compartilhado/t')).toBe('copiado');
    expect(copiado).toBe('https://x/compartilhado/t');
  });

  it('com Web Share abre a folha; cancelar não copia, falha copia', async () => {
    const share = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    expect(await compartilharLink('Plano', 'u')).toBe('enviado');
    expect(share).toHaveBeenCalledWith({ text: 'Plano', url: 'u' });

    share.mockRejectedValueOnce(new DOMException('cancelou', 'AbortError'));
    expect(await compartilharLink('Plano', 'u')).toBe('enviado');
    expect(copiado).toBeNull();

    share.mockRejectedValueOnce(new DOMException('sem gesto', 'NotAllowedError'));
    expect(await compartilharLink('Plano', 'u')).toBe('copiado');
  });
});
