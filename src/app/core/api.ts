import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Exercicio, GrupoMuscular, Plano, PlanoRequest, PlanoResumo } from './modelos';

export const API_URL = 'http://localhost:8080/api';

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
