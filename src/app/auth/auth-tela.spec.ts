import { signal } from '@angular/core';
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
  const auth = { logado: () => false, avisoLogin: signal<string | null>(null), entrar: vi.fn(() => of(undefined)), entrarComGoogle: vi.fn(() => of(undefined)) };

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

  it('entrar: segue o design do Stitch (Gym Rat Protocol, sem Apple nem convidado) e leva a esqueci a senha e ao cadastro', () => {
    const { tela } = abrir('entrar');
    const texto = tela.textContent ?? '';

    expect(tela.querySelector('.selo')!.textContent).toContain('Gym Rat Protocol');
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

  it('entrar: mostra uma vez o aviso de sessão expirada deixado pela abertura do app', () => {
    auth.avisoLogin.set('Sua sessão expirou. Entre de novo.');
    const { tela } = abrir('entrar');
    expect(tela.querySelector('[role=alert]')!.textContent).toContain('Sua sessão expirou. Entre de novo.');
    expect(auth.avisoLogin()).toBeNull();
  });

  /** Preenche o cadastro com dados válidos e a senha dada, sem marcar os termos. */
  function preencherCadastro(digitar: (rotulo: string, valor: string) => void, senha: string, confirmacao = senha) {
    digitar('Como quer ser chamado', 'Maria');
    digitar('E-mail', 'maria@teste.com');
    digitar('Senha', senha);
    digitar('Confirmar', confirmacao);
  }

  it('cadastrar: segue o Stitch (sem card do clube, Apple nem nuvem) com medidor, confirmação e termos', () => {
    const { tela } = abrir('cadastrar');
    const texto = tela.textContent ?? '';

    expect(tela.querySelector('h1')!.textContent).toBe('Criar nova conta');
    expect(texto).toContain('Registre cada quilo, supere suas cargas e atinja novos recordes pessoais.');
    expect(texto).not.toContain('Iron Pulse');
    expect(texto).not.toContain('Gym Rat');
    expect(texto).not.toContain('Apple');
    expect(texto).not.toContain('Sincronização');
    expect(texto).not.toContain('Desejo receber'); // sem o checkbox de novidades
    expect(tela.querySelector('app-forca-senha')).not.toBeNull();
    expect(tela.querySelector('#campo-confirmacao')).not.toBeNull();
    expect(tela.querySelector('.termos')!.textContent).toContain('Termos de Uso');
    expect(tela.querySelector('.termos')!.textContent).toContain('Política de Privacidade');
    expect(tela.querySelector('.enviar')!.textContent).toContain('Criar minha conta');
    expect(tela.querySelector('.ja-tem-conta a')!.getAttribute('href')).toBe('/entrar');
  });

  it('cadastrar: só habilita com senha forte, confirmação igual e termos marcados', () => {
    const { fixture, tela, digitar } = abrir('cadastrar');
    const botao = tela.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const marcarTermos = () => {
      const caixa = tela.querySelector<HTMLInputElement>('.termos input')!;
      caixa.checked = true;
      caixa.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    preencherCadastro(digitar, 'fraca');
    marcarTermos();
    expect(botao.disabled).toBe(true); // senha fraca

    preencherCadastro(digitar, 'Senha-Forte-123!', 'Senha-Forte-123?');
    expect(botao.disabled).toBe(true); // confirmação diferente
    expect(tela.querySelector('.nao-confere')!.textContent).toContain('As senhas não conferem');

    preencherCadastro(digitar, 'Senha-Forte-123!');
    expect(tela.querySelector('.nao-confere')).toBeNull();
    expect(botao.disabled).toBe(false);
  });

  it('cadastrar: sem marcar os termos não avança, mesmo com tudo preenchido', () => {
    const { tela, digitar, enviar } = abrir('cadastrar');
    preencherCadastro(digitar, 'Senha-Forte-123!');

    expect(tela.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    enviar();
    expect(api.cadastrar).not.toHaveBeenCalled();
  });

  it('cadastrar: o medidor acompanha a senha e depois do cadastro pede para abrir o e-mail', () => {
    const { fixture, tela, digitar, enviar } = abrir('cadastrar');
    const medidor = tela.querySelector('app-forca-senha')!;
    expect(medidor.getAttribute('data-forca')).toBe('fraca');

    digitar('Senha', 'Abcdefghi1');
    expect(medidor.getAttribute('data-forca')).toBe('media');
    digitar('Senha', 'Senha-Forte-123!');
    expect(medidor.getAttribute('data-forca')).toBe('forte');
    expect(medidor.textContent).toContain('FORTE');

    preencherCadastro(digitar, 'Senha-Forte-123!');
    const caixa = tela.querySelector<HTMLInputElement>('.termos input')!;
    caixa.checked = true;
    caixa.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    enviar();

    expect(api.cadastrar).toHaveBeenCalledWith({ nome: 'Maria', email: 'maria@teste.com', senha: 'Senha-Forte-123!' });
    expect(tela.querySelector('.sucesso')!.textContent).toContain('maria@teste.com');
    expect(tela.querySelector('form')).toBeNull();
  });

  it('cadastrar: com o Google ativo o botão vem antes do formulário, como "Cadastrar com Google"', async () => {
    api.config.mockReturnValueOnce(of({ googleClientId: 'cliente.apps.googleusercontent.com' }));
    (window as unknown as { google: unknown }).google = {
      accounts: { oauth2: { initCodeClient: () => ({ requestCode: vi.fn() }) } },
    };
    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(no: T): T => {
      setTimeout(() => (no as unknown as HTMLScriptElement).onload?.(new Event('load')));
      return no;
    });

    const { fixture, tela } = abrir('cadastrar');
    await new Promise(resolve => setTimeout(resolve, 10));
    fixture.detectChanges();

    const botao = tela.querySelector('.botao-google')!;
    expect(botao.textContent).toContain('Cadastrar com Google');
    expect(tela.textContent).toContain('ou cadastre com seu e-mail');
    expect(botao.compareDocumentPosition(tela.querySelector('form')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('esqueci a senha: a resposta é a mesma exista a conta ou não', () => {
    const { tela, digitar, enviar } = abrir('esqueci');
    digitar('E-mail', 'qualquer@teste.com');
    enviar();

    expect(api.esqueciSenha).toHaveBeenCalledWith('qualquer@teste.com');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('Se existir uma conta');
  });

  it('redefinir: exige senha forte e confirmação igual e manda o token do link junto com a nova senha', () => {
    const { tela, digitar, enviar } = abrir('redefinir', 'abc123');
    const botao = tela.querySelector<HTMLButtonElement>('button[type=submit]')!;

    digitar('Nova senha', 'fraca');
    digitar('Confirmar', 'fraca');
    expect(botao.disabled).toBe(true);

    digitar('Nova senha', 'Outra-Senha-456!');
    digitar('Confirmar', 'Outra-Senha-456?');
    expect(botao.disabled).toBe(true);

    digitar('Confirmar', 'Outra-Senha-456!');
    expect(botao.disabled).toBe(false);
    enviar();

    expect(api.redefinirSenha).toHaveBeenCalledWith('abc123', 'Outra-Senha-456!');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('Senha redefinida');
  });

  it('confirmar e-mail: confirma sozinho ao abrir o link', () => {
    const { tela } = abrir('confirmar', 'tok');

    expect(api.confirmarEmail).toHaveBeenCalledWith('tok');
    expect(tela.querySelector('.sucesso')!.textContent).toContain('E-mail confirmado');
  });
});
