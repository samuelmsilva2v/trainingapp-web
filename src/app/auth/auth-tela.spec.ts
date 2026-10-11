import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from '../core/api';
import { AuthStore } from '../core/auth';
import { AuthTela } from './auth-tela';

describe('AuthTela', () => {
  const api = {
    config: vi.fn(() => of({ googleClientId: '' })),
    cadastrar: vi.fn(() => of(undefined)),
    confirmarEmail: vi.fn(() => of(undefined)),
    esqueciSenha: vi.fn(() => of(undefined)),
    redefinirSenha: vi.fn(() => of(undefined)),
  };
  const auth = { logado: () => false, entrar: vi.fn(() => of(undefined)), entrarComGoogle: vi.fn(() => of(undefined)) };

  function abrir(modo: string, token?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: api },
        { provide: AuthStore, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { modo }, queryParamMap: convertToParamMap(token ? { token } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(AuthTela);
    fixture.detectChanges();
    const tela = fixture.nativeElement as HTMLElement;
    const digitar = (rotulo: string, valor: string) => {
      const rotuloDoCampo = [...tela.querySelectorAll('label')].find(l => l.textContent!.includes(rotulo))!;
      const campo = tela.querySelector<HTMLInputElement>('#' + rotuloDoCampo.htmlFor)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const enviar = () => {
      tela.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, tela, digitar, enviar };
  }

  beforeEach(() => vi.clearAllMocks());

  it('entrar: segue o design do Stitch (Tank Top Protocol, sem Apple nem convidado) e leva a esqueci a senha e ao cadastro', () => {
    const { tela } = abrir('entrar');
    const texto = tela.textContent ?? '';

    expect(tela.querySelector('.selo')!.textContent).toContain('Tank Top Protocol');
    expect(tela.querySelector('.nome')!.textContent).toBe('TrainingApp');
    expect(texto).not.toContain('Heavy Iron');
    expect(texto).not.toContain('Apple');
    expect(texto).not.toContain('Convidado');
    expect(tela.querySelector('.esqueceu')!.getAttribute('href')).toBe('/esqueci-senha');
    expect(tela.querySelector('.cadastre')!.getAttribute('href')).toBe('/cadastrar');
  });

  it('entrar: o olho revela e esconde a senha', () => {
    const { fixture, tela } = abrir('entrar');
    const campo = tela.querySelector<HTMLInputElement>('#campo-senha')!;
    const olho = tela.querySelector<HTMLButtonElement>('.olho')!;
    expect(campo.type).toBe('password');
    expect(olho.getAttribute('aria-label')).toBe('Revelar senha');

    olho.click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
    expect(olho.getAttribute('aria-label')).toBe('Ocultar senha');

    olho.click();
    fixture.detectChanges();
    expect(campo.type).toBe('password');
  });

  it('entrar: sem client id configurado na API não há botão do Google', () => {
    const { tela } = abrir('entrar');

    expect(tela.querySelector('.botao-google')).toBeNull();
    expect(tela.textContent).not.toContain('ou continue com');
  });

  it('entrar: o botão do Google abre o popup e entrega o código à API', async () => {
    api.config.mockReturnValueOnce(of({ googleClientId: 'cliente.apps.googleusercontent.com' }));
    // O script do Google não carrega no teste: o carregador recebe um onload simulado e um window.google falso.
    let configuracao!: { callback: (r: { code?: string }) => void; scope: string; ux_mode: string; client_id: string };
    const requestCode = vi.fn();
    (window as unknown as { google: unknown }).google = {
      accounts: { oauth2: { initCodeClient: (c: typeof configuracao) => ((configuracao = c), { requestCode }) } },
    };
    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(no: T): T => {
      setTimeout(() => (no as unknown as HTMLScriptElement).onload?.(new Event('load')));
      return no;
    });

    const { fixture, tela } = abrir('entrar');
    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    const botao = tela.querySelector<HTMLButtonElement>('.botao-google')!;
    expect(botao.textContent).toContain('Continuar com Google');
    expect(tela.textContent).toContain('ou continue com');
    expect(configuracao.client_id).toBe('cliente.apps.googleusercontent.com');
    expect(configuracao.scope).toBe('openid email profile');
    expect(configuracao.ux_mode).toBe('popup');

    botao.click();
    expect(requestCode).toHaveBeenCalledTimes(1);

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    configuracao.callback({ code: 'codigo-do-popup' });
    expect(auth.entrarComGoogle).toHaveBeenCalledWith('codigo-do-popup');
    expect(navegar).toHaveBeenCalledWith('/hoje');

    configuracao.callback({});
    fixture.detectChanges();
    expect(tela.querySelector('[role=alert]')!.textContent).toContain('O Google não autorizou');
  });

  it('entrar: só habilita com e-mail e senha e vai para o Hoje', () => {
    const { tela, digitar, enviar } = abrir('entrar');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const botao = tela.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(botao.disabled).toBe(true);

    digitar('E-mail', 'maria@teste.com');
    digitar('Senha', 'senha-forte-123');
    expect(botao.disabled).toBe(false);
    enviar();

    expect(auth.entrar).toHaveBeenCalledWith('maria@teste.com', 'senha-forte-123');
    expect(navegar).toHaveBeenCalledWith('/hoje');
  });

  it('entrar: mostra a mensagem da API quando o login falha', () => {
    auth.entrar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401, error: { detail: 'E-mail ou senha incorretos' } })) as never);
    const { tela, digitar, enviar } = abrir('entrar');
    digitar('E-mail', 'maria@teste.com');
    digitar('Senha', 'errada');
    enviar();

    expect(tela.querySelector('[role=alert]')!.textContent).toContain('E-mail ou senha incorretos');
  });

  it('cadastrar: exige senha de 8+ caracteres e depois pede para abrir o e-mail', () => {
    const { tela, digitar, enviar } = abrir('cadastrar');
    const botao = tela.querySelector<HTMLButtonElement>('button[type=submit]')!;
    digitar('Nome', 'Maria');
    digitar('E-mail', 'maria@teste.com');
    digitar('Senha', 'curta');
    expect(botao.disabled).toBe(true);

    digitar('Senha', 'senha-forte-123');
    enviar();

    expect(api.cadastrar).toHaveBeenCalledWith({ nome: 'Maria', email: 'maria@teste.com', senha: 'senha-forte-123' });
    expect(tela.querySelector('.sucesso')!.textContent).toContain('maria@teste.com');
    expect(tela.querySelector('form')).toBeNull();
  });

  it('esqueci a senha: a resposta é a mesma exista a conta ou não', () => {
    const { tela, digitar, enviar } = abrir('esqueci');
    digitar('E-mail', 'qualquer@teste.com');
    enviar();

    expect(api.esqueciSenha).toHaveBeenCalledWith('qualquer@teste.com');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('Se existir uma conta');
  });

  it('redefinir: manda o token do link junto com a nova senha', () => {
    const { tela, digitar, enviar } = abrir('redefinir', 'abc123');
    digitar('Nova senha', 'outra-senha-456');
    enviar();

    expect(api.redefinirSenha).toHaveBeenCalledWith('abc123', 'outra-senha-456');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('Senha redefinida');
  });

  it('confirmar e-mail: confirma sozinho ao abrir o link', () => {
    const { tela } = abrir('confirmar', 'tok');

    expect(api.confirmarEmail).toHaveBeenCalledWith('tok');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('E-mail confirmado');
  });
});
