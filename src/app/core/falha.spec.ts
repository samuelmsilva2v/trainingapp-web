import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { falhaDe } from './falha';

const http = (status: number) => new HttpErrorResponse({ status });

describe('falhaDe', () => {
  it('status 0: sem internet quando o aparelho está offline, servidor indisponível quando há rede', () => {
    expect(falhaDe(http(0), false).tipo).toBe('sem-internet');
    expect(falhaDe(http(0), true).tipo).toBe('indisponivel');
  });

  it('502 e 503 (proxy sem a API, ex.: deploy) são servidor indisponível', () => {
    expect(falhaDe(http(502)).tipo).toBe('indisponivel');
    expect(falhaDe(http(503)).tipo).toBe('indisponivel');
  });

  it('504 e o tempo limite do front são servidor demorando', () => {
    expect(falhaDe(http(504)).tipo).toBe('demorando');
    expect(falhaDe(new TimeoutError()).tipo).toBe('demorando');
  });

  it('403 é acesso restrito e 404 é página não encontrada', () => {
    expect(falhaDe(http(403)).tipo).toBe('restrito');
    expect(falhaDe(http(404)).tipo).toBe('nao-encontrada');
  });

  it('500 e códigos não previstos são erro inesperado, com o código', () => {
    expect(falhaDe(http(500))).toEqual({ tipo: 'inesperado', codigo: 500 });
    expect(falhaDe(http(418))).toEqual({ tipo: 'inesperado', codigo: 418 });
    expect(falhaDe(new Error('x'))).toEqual({ tipo: 'inesperado', codigo: null });
  });
});
