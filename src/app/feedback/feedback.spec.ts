import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FeedbackApi, PerfilApi } from '../core/api';
import { FeedbackRequest } from '../core/modelos';
import { FeedbackTela } from './feedback';

describe('FeedbackTela', () => {
  let resposta: () => Observable<void>;
  const enviar = vi.fn((_: FeedbackRequest) => resposta());
  const navigate = vi.fn(() => Promise.resolve(true));

  function abrir(tela?: string) {
    resposta = () => of(undefined);
    enviar.mockClear();
    navigate.mockClear();
    history.replaceState(tela ? { tela } : null, '');
    TestBed.configureTestingModule({
      providers: [
        { provide: FeedbackApi, useValue: { enviar } },
        { provide: PerfilApi, useValue: { obter: () => of({ nome: 'Samuel', email: 's@teste.com', temSenha: true, lembretePesoDias: null }) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const fixture = TestBed.createComponent(FeedbackTela);
    fixture.detectChanges();
    const tela$ = fixture.nativeElement as HTMLElement;
    const digitar = (seletor: string, valor: string) => {
      const campo = tela$.querySelector<HTMLInputElement | HTMLTextAreaElement>(seletor)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const escolher = (valor: string) => {
      const select = tela$.querySelector('select')!;
      select.value = valor;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const botao = () => tela$.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const submeter = async () => {
      tela$.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, tela: tela$, digitar, escolher, botao, submeter };
  }

  it('o nome já vem do perfil; as quatro categorias estão no seletor', () => {
    const { tela } = abrir();
    expect(tela.querySelector<HTMLInputElement>('input[name=nome]')!.value).toBe('Samuel');
    const opcoes = [...tela.querySelectorAll('option')].map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Selecione…', 'Reportar bug', 'Sugestão de melhoria', 'Nova funcionalidade', 'Outro']);
  });

  it('só habilita o Enviar com nome, categoria e mensagem de 10 a 2.000 caracteres (sem contar espaços nas pontas)', () => {
    const { tela, digitar, escolher, botao } = abrir();
    expect(botao().disabled).toBe(true);

    escolher('BUG');
    digitar('textarea', '   curta    ');
    expect(tela.querySelector('.contador')!.textContent).toBe('5/2000');
    expect(botao().disabled).toBe(true);

    digitar('textarea', 'O treino travou ao concluir');
    expect(botao().disabled).toBe(false);

    digitar('input[name=nome]', '   ');
    expect(botao().disabled).toBe(true);
    digitar('input[name=nome]', 'Samuel');

    digitar('textarea', 'a'.repeat(2001));
    expect(botao().disabled).toBe(true);

    escolher('');
    digitar('textarea', 'O treino travou ao concluir');
    expect(botao().disabled).toBe(true);
  });

  it('envia os campos aparados com o contexto, agradece e volta ao Perfil', async () => {
    const { digitar, escolher, submeter } = abrir('/historico');
    digitar('input[name=nome]', '  Samuel S.  ');
    escolher('MELHORIA');
    digitar('textarea', '  Mostrar o volume por semana  ');

    await submeter();

    expect(enviar).toHaveBeenCalledWith({
      nome: 'Samuel S.',
      categoria: 'MELHORIA',
      mensagem: 'Mostrar o volume por semana',
      plataforma: 'web',
      versaoApp: null,
      tela: '/historico',
      userAgent: navigator.userAgent.slice(0, 500),
    });
    expect(navigate).toHaveBeenCalledWith(['/perfil']);
  });

  it('sem a tela anterior, o contexto vai com tela nula', async () => {
    const { digitar, escolher, submeter } = abrir();
    escolher('OUTRO');
    digitar('textarea', 'Uma dúvida sobre o app');
    await submeter();
    expect(enviar.mock.calls[0][0].tela).toBeNull();
  });

  it('sem rede: avisa e mantém o texto no formulário', async () => {
    const { tela, digitar, escolher, submeter, botao } = abrir();
    resposta = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    escolher('BUG');
    digitar('textarea', 'O treino travou ao concluir');

    await submeter();

    expect(tela.querySelector('[role=alert]')!.textContent).toContain('Sem conexão. Tente de novo mais tarde.');
    expect(tela.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('O treino travou ao concluir');
    expect(botao().disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('429: avisa que o limite do dia acabou', async () => {
    const { tela, digitar, escolher, submeter } = abrir();
    resposta = () => throwError(() => new HttpErrorResponse({ status: 429 }));
    escolher('BUG');
    digitar('textarea', 'O treino travou ao concluir');

    await submeter();

    expect(tela.querySelector('[role=alert]')!.textContent).toContain('Limite de envios do dia atingido.');
  });
});
