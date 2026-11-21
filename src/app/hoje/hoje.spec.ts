import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PerfilApi, PesoApi, SessoesApi } from '../core/api';
import { GamificacaoStore } from '../core/gamificacao-store';
import { TreinoStore } from '../core/treino-store';
import { HojeTela } from './hoje';

function abrir(treinoNoAparelho: boolean): HTMLElement {
  const semRede = () => throwError(() => new HttpErrorResponse({ status: 0 }));
  TestBed.configureTestingModule({
    imports: [HojeTela],
    providers: [
      provideRouter([]),
      { provide: SessoesApi, useValue: { hoje: semRede, historico: semRede } },
      { provide: PerfilApi, useValue: { obter: semRede } },
      { provide: PesoApi, useValue: { listar: () => of([]) } },
      { provide: GamificacaoStore, useValue: { dados: signal(null), progresso: signal(0) } },
      { provide: TreinoStore, useValue: { pendenteEnviado: signal(0), abrirDoAparelho: () => treinoNoAparelho } },
    ],
  });
  const fixture = TestBed.createComponent(HojeTela);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HojeTela', () => {
  it('sem rede oferece continuar o treino guardado no aparelho', () => {
    expect(abrir(true).textContent).toContain('Continuar o treino salvo no aparelho');
  });

  it('sem rede e sem treino no aparelho, só mostra o erro', () => {
    expect(abrir(false).textContent).not.toContain('Continuar o treino salvo no aparelho');
  });
});
