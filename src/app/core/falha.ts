import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Por que uma tela (ou a abertura do app) não conseguiu carregar. Erros de ação (409, 422) não passam por aqui. */
export type TipoFalha = 'sem-internet' | 'indisponivel' | 'demorando' | 'inesperado' | 'restrito' | 'nao-encontrada';

export interface Falha {
  tipo: TipoFalha;
  /** Código HTTP, mostrado só no "Erro inesperado" para ajudar a entender relatos. */
  codigo: number | null;
}

export interface TextoFalha {
  icone: string;
  titulo: string;
  frase: string;
  botao: string;
}

export const TEXTOS_FALHA: Record<TipoFalha, TextoFalha> = {
  'sem-internet': {
    icone: 'wifi_off',
    titulo: 'Sem internet',
    frase: 'Você está sem conexão. Assim que a internet voltar, o app continua.',
    botao: 'Tentar de novo',
  },
  indisponivel: {
    icone: 'cloud_off',
    titulo: 'Servidor indisponível',
    frase: 'O servidor está fora do ar ou sendo atualizado. Tentando de novo…',
    botao: 'Tentar de novo',
  },
  demorando: {
    icone: 'hourglass_empty',
    titulo: 'Servidor demorando',
    frase: 'O servidor está demorando para responder. Tentando de novo…',
    botao: 'Tentar de novo',
  },
  inesperado: {
    icone: 'error',
    titulo: 'Erro inesperado',
    frase: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
    botao: 'Tentar de novo',
  },
  restrito: {
    icone: 'lock',
    titulo: 'Acesso restrito',
    frase: 'Este e-mail não está autorizado a usar o app.',
    botao: 'Entrar com outra conta',
  },
  'nao-encontrada': {
    icone: 'search_off',
    titulo: 'Página não encontrada',
    frase: 'Esta página não existe ou foi apagada.',
    botao: 'Ir para Hoje',
  },
};

/** Tipos que costumam passar sozinhos: a tela tenta de novo sem a pessoa fazer nada. */
export const TENTA_SOZINHO: ReadonlySet<TipoFalha> = new Set(['sem-internet', 'indisponivel', 'demorando']);

/**
 * Traduz o erro de uma carga em tipo de tela. Status 0 é "sem resposta": sem internet no aparelho, ou o servidor
 * inalcançável. 502/503 são o proxy sem a API (deploy); 504 e o tempo limite do front, o servidor lento.
 */
export function falhaDe(erro: unknown, online = typeof navigator === 'undefined' || navigator.onLine): Falha {
  if (erro instanceof TimeoutError) return { tipo: 'demorando', codigo: null };
  if (!(erro instanceof HttpErrorResponse)) return { tipo: 'inesperado', codigo: null };
  switch (erro.status) {
    case 0:
      return { tipo: online ? 'indisponivel' : 'sem-internet', codigo: null };
    case 502:
    case 503:
      return { tipo: 'indisponivel', codigo: null };
    case 504:
      return { tipo: 'demorando', codigo: null };
    case 403:
      return { tipo: 'restrito', codigo: null };
    case 404:
      return { tipo: 'nao-encontrada', codigo: null };
    default:
      return { tipo: 'inesperado', codigo: erro.status };
  }
}
