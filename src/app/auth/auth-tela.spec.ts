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
    config: () => of({ googleClientId: '' }),
    cadastrar: vi.fn(() => of(undefined)),
    confirmarEmail: vi.fn(() => of(undefined)),
    esqueciSenha: vi.fn(() => of(undefined)),
    redefinirSenha: vi.fn(() => of(undefined)),
  };
  const auth = { logado: () => false, entrar: vi.fn(() => of(undefined)) };

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
      const campo = [...tela.querySelectorAll('label')].find(l => l.textContent!.includes(rotulo))!.querySelector('input')!;
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
