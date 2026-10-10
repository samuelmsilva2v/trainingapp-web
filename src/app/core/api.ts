import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Exercicio, Gamificacao, GrupoMuscular, Hoje, Perfil, Plano, PlanoRequest, PlanoResumo, SessaoLocal, SessaoResumo,
} from './modelos';

export const API_URL = environment.apiUrl;

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
    const { xpGanho, xpSessao, xpSeries, xpRecordes, recordes, ...corpo } = sessao;
    return this.http.put<SessaoLocal>(`${API_URL}/sessoes/${sessao.id}`, corpo);
  }
}

@Injectable({ providedIn: 'root' })
export class PerfilApi {
  private readonly http = inject(HttpClient);

  obter(): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_URL}/perfil`);
  }

  atualizar(perfil: Perfil): Observable<Perfil> {
    return this.http.put<Perfil>(`${API_URL}/perfil`, perfil);
  }
}

@Injectable({ providedIn: 'root' })
export class GamificacaoApi {
  private readonly http = inject(HttpClient);

  resumo(): Observable<Gamificacao> {
    return this.http.get<Gamificacao>(`${API_URL}/gamificacao`);
  }
}
