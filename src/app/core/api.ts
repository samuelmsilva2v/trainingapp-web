import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CofreRefresh } from './cofre';
import {
  Acesso, Anterior, Exercicio, ExercicioRequest, FeedbackRequest, Gamificacao, GrupoMuscular, Hoje, Perfil, PerfilRequest, Peso, Plano, PlanoRequest, PlanoResumo,
  SessaoLocal, SessaoResumo,
} from './modelos';

export const API_URL = environment.apiUrl;

/** Como quem pede a exclusão da conta prova que é o dono: um dos três. */
export type ProvaDeIdentidade = { senha?: string; codigo?: string; idToken?: string };

/** Extrai a mensagem do ProblemDetail da API (campo `detail`) ou devolve um texto padrão. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) return 'Não foi possível conectar à API.';
    const detalhe = erro.error?.detail;
    if (typeof detalhe === 'string' && detalhe) return detalhe;
    if (erro.status === 400) return 'Dados inválidos. Revise os campos.';
    if (erro.status === 404) return 'Registro não encontrado.';
  }
  return 'Algo deu errado. Tente novamente.';
}

@Injectable({ providedIn: 'root' })
export class PlanosApi {
  private readonly http = inject(HttpClient);

  listar(): Observable<PlanoResumo[]> {
    return this.http.get<PlanoResumo[]>(`${API_URL}/planos`);
  }

  obter(id: string): Observable<Plano> {
    return this.http.get<Plano>(`${API_URL}/planos/${id}`);
  }

  criar(plano: PlanoRequest): Observable<Plano> {
    return this.http.post<Plano>(`${API_URL}/planos`, plano);
  }

  atualizar(id: string, plano: PlanoRequest): Observable<Plano> {
    return this.http.put<Plano>(`${API_URL}/planos/${id}`, plano);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/planos/${id}`);
  }

  ativar(id: string): Observable<Plano> {
    return this.http.post<Plano>(`${API_URL}/planos/${id}/ativar`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ExerciciosApi {
  private readonly http = inject(HttpClient);

  listar(grupo: GrupoMuscular | null, busca: string): Observable<Exercicio[]> {
    let params = new HttpParams();
    if (grupo) params = params.set('grupo', grupo);
    if (busca.trim()) params = params.set('busca', busca.trim());
    return this.http.get<Exercicio[]>(`${API_URL}/exercicios`, { params });
  }

  criar(exercicio: ExercicioRequest): Observable<Exercicio> {
    return this.http.post<Exercicio>(`${API_URL}/exercicios`, exercicio);
  }
}


@Injectable({ providedIn: 'root' })
export class SessoesApi {
  private readonly http = inject(HttpClient);

  hoje(): Observable<Hoje> {
    return this.http.get<Hoje>(`${API_URL}/hoje`);
  }

  pular(): Observable<Hoje> {
    return this.http.post<Hoje>(`${API_URL}/hoje/pular`, {});
  }

  historico(pagina: number, tamanho: number): Observable<SessaoResumo[]> {
    const params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho);
    return this.http.get<SessaoResumo[]>(`${API_URL}/sessoes`, { params });
  }

  /** Séries do último treino concluído de cada exercício (coluna "Anterior"). */
  anteriores(exercicioIds: string[]): Observable<Anterior[]> {
    const params = new HttpParams().set('exercicioIds', exercicioIds.join(','));
    return this.http.get<Anterior[]>(`${API_URL}/sessoes/anteriores`, { params });
  }

  obter(id: string): Observable<SessaoLocal> {
    return this.http.get<SessaoLocal>(`${API_URL}/sessoes/${id}`);
  }

  /** Apaga um treino encerrado; a API estorna o XP e os recordes dele. */
  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/sessoes/${id}`);
  }

  /** Upsert idempotente: o cliente gera os ids e reenvia a sessão inteira. */
  salvar(sessao: SessaoLocal): Observable<SessaoLocal> {
    // xpGanho e recordes são só de leitura: a API os calcula.
    const { xpGanho, xpSeries, xpRecordes, xpStreak, xpConquistas, conquistas, xpDesafios, desafios, recordes, ...corpo } = sessao;
    return this.http.put<SessaoLocal>(`${API_URL}/sessoes/${sessao.id}`, corpo);
  }
}

@Injectable({ providedIn: 'root' })
export class PerfilApi {
  private readonly http = inject(HttpClient);

  obter(): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_URL}/perfil`);
  }

  atualizar(perfil: PerfilRequest): Observable<Perfil> {
    return this.http.put<Perfil>(`${API_URL}/perfil`, perfil);
  }
}

@Injectable({ providedIn: 'root' })
export class FeedbackApi {
  private readonly http = inject(HttpClient);

  enviar(feedback: FeedbackRequest): Observable<void> {
    return this.http.post<void>(`${API_URL}/feedback`, feedback);
  }
}

@Injectable({ providedIn: 'root' })
export class PesoApi {
  private readonly http = inject(HttpClient);

  listar(): Observable<Peso[]> {
    return this.http.get<Peso[]>(`${API_URL}/peso`);
  }

  /** Grava ou substitui a pesagem do dia. */
  registrar(data: string, kg: number): Observable<Peso> {
    return this.http.put<Peso>(`${API_URL}/peso/${data}`, { kg });
  }

  excluir(data: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/peso/${data}`);
  }
}

/**
 * Endpoints de login. Na web o refresh token vai e volta no cookie HttpOnly, que o navegador cuida sozinho. No app
 * Android não há cookie: o login pede o refresh no corpo (X-Cliente) e as outras chamadas o mandam no corpo.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly cofre = inject(CofreRefresh);

  private get opcoesDoLogin(): { headers?: Record<string, string> } {
    return this.cofre.noApp ? { headers: { 'X-Cliente': 'android' } } : {};
  }

  private get refresh(): { refresh?: string | null } {
    return this.cofre.noApp ? { refresh: this.cofre.valor } : {};
  }

  config(): Observable<{ googleClientId: string }> {
    return this.http.get<{ googleClientId: string }>(`${API_URL}/auth/config`);
  }

  cadastrar(dados: { nome: string; email: string; senha: string }): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/cadastro`, dados);
  }

  confirmarEmail(token: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/confirmar-email`, { token });
  }

  entrar(email: string, senha: string): Observable<Acesso> {
    return this.http.post<Acesso>(`${API_URL}/auth/login`, { email, senha }, this.opcoesDoLogin);
  }

  /** App Android: o ID token que o Credential Manager entregou (o popup do Google não abre em WebView). */
  entrarComGoogleIdToken(idToken: string): Observable<Acesso> {
    return this.http.post<Acesso>(`${API_URL}/auth/google/token`, { idToken }, this.opcoesDoLogin);
  }

  /** O código de uso único que o popup do Google entregou; a API o troca por tokens. */
  entrarComGoogle(codigo: string): Observable<Acesso> {
    return this.http.post<Acesso>(`${API_URL}/auth/google`, { codigo }, this.opcoesDoLogin);
  }

  renovar(): Observable<Acesso> {
    return this.http.post<Acesso>(`${API_URL}/auth/refresh`, this.refresh);
  }

  sair(): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/sair`, this.refresh);
  }

  esqueciSenha(email: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/esqueci-senha`, { email });
  }

  redefinirSenha(token: string, senha: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/redefinir-senha`, { token, senha });
  }

  /** Apaga a conta e tudo que é dela. A prova é a senha ou, em conta só do Google, o código do popup (web) ou o ID token (app). */
  excluirConta(prova: ProvaDeIdentidade): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/excluir-conta`, prova);
  }

  trocarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/trocar-senha`, { senhaAtual, novaSenha, ...this.refresh });
  }
}

@Injectable({ providedIn: 'root' })
export class GamificacaoApi {
  private readonly http = inject(HttpClient);

  resumo(): Observable<Gamificacao> {
    return this.http.get<Gamificacao>(`${API_URL}/gamificacao`);
  }
}
