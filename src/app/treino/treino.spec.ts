import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessoesApi } from '../core/api';
import { SessaoLocal } from '../core/modelos';
import { TreinoStore } from '../core/treino-store';
import { Treino } from './treino';

const sessao = (imagens?: string[]): SessaoLocal => ({
  id: 's1',
  planoId: null,
  planoNome: 'Plano',
  diaNome: 'A',
  diaOrdem: 0,
  estado: 'EM_ANDAMENTO',
  iniciadaEm: new Date().toISOString(),
  finalizadaEm: null,
  atualizadoEm: new Date().toISOString(),
  exercicios: [
    {
      id: 'e1',
      exercicioId: 'x1',
      nome: 'Supino',
      grupoMuscular: 'PEITO',
      equipamento: 'BARRA',
      imagens,
      metaSeries: 1,
      metaRepsMin: 8,
      metaRepsMax: 10,
      metaCarga: null,
      metaDescansoSegundos: null,
      series: [{ id: 'r1', reps: 8, carga: 60, concluida: false }],
    },
  ],
});

describe('Treino: fotos do exercício', () => {
  function abrir(imagens?: string[]): HTMLElement {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessoesApi, useValue: { anteriores: () => of([]), salvar: (s: SessaoLocal) => of(s) } },
      ],
    });
    TestBed.inject(TreinoStore).retomar(sessao(imagens));
    const fixture = TestBed.createComponent(Treino);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('mostra a foto inicial e a final', () => {
    const tela = abrir(['http://img/a/0.jpg', 'http://img/a/1.jpg']);

    const fotos = [...tela.querySelectorAll<HTMLImageElement>('.fotos img')];
    expect(fotos.map(f => f.getAttribute('src'))).toEqual(['http://img/a/0.jpg', 'http://img/a/1.jpg']);
  });

  it('foto que não carrega some, e sem fotos não há imagem alguma', () => {
    const tela = abrir(['http://img/a/0.jpg', 'http://img/a/1.jpg']);
    tela.querySelectorAll('.fotos img').forEach(f => f.dispatchEvent(new Event('error')));
    expect(tela.querySelectorAll('.fotos img').length).toBe(0);

    TestBed.resetTestingModule();
    expect(abrir(undefined).querySelectorAll('.fotos img').length).toBe(0);
  });
});
