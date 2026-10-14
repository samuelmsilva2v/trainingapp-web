import { CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ItemPlano } from '../../core/modelos';
import { PlanoEditor, definirCampo } from './plano-editor';

const item = {
  exercicioId: 'x',
  series: 3,
  repsMin: 8,
  repsMax: 12,
  cargaAlvo: 60,
  descansoSegundos: 90,
} as ItemPlano;

describe('definirCampo', () => {
  it('guarda a carga digitada com até 2 casas, como no treino, e limita a 9999,99', () => {
    expect(definirCampo(item, 'cargaAlvo', 47.5).cargaAlvo).toBe(47.5);
    expect(definirCampo(item, 'cargaAlvo', 21.25).cargaAlvo).toBe(21.25);
    expect(definirCampo(item, 'cargaAlvo', 11.256).cargaAlvo).toBe(11.26);
    expect(definirCampo(item, 'cargaAlvo', 20000).cargaAlvo).toBe(9999.99);
  });

  it('etapas do drop-set contam a primeira: 2 a 4, gravadas como drops (só o interruptor volta a 0)', () => {
    expect(definirCampo(item, 'etapas', 3).drops).toBe(2); // 8-6-4
    expect(definirCampo(item, 'etapas', 7).drops).toBe(3);
    expect(definirCampo(item, 'etapas', 1).drops).toBe(1);
    expect(definirCampo(item, 'etapas', null).drops).toBe(1);
  });

  it('no drop-set as reps são um número só (as da primeira etapa)', () => {
    const r = definirCampo({ ...item, repsMin: 8, repsMax: 12 }, 'reps', 10);
    expect([r.repsMin, r.repsMax]).toEqual([10, 10]);
  });

    it('carga vazia ou zero vira sem carga alvo', () => {
    expect(definirCampo(item, 'cargaAlvo', null).cargaAlvo).toBeNull();
    expect(definirCampo(item, 'cargaAlvo', 0).cargaAlvo).toBeNull();
  });

  it('limita séries, reps e descanso aos valores da API', () => {
    expect(definirCampo(item, 'series', 99).series).toBe(20);
    expect(definirCampo(item, 'series', 0).series).toBe(1);
    expect(definirCampo(item, 'repsMax', 500).repsMax).toBe(100);
    expect(definirCampo(item, 'descansoSegundos', 5000).descansoSegundos).toBe(1800);
    expect(definirCampo(item, 'descansoSegundos', 0).descansoSegundos).toBeNull();
  });

  it('reps mínimas nunca passam das máximas (e vice-versa)', () => {
    const subiu = definirCampo(item, 'repsMin', 20);
    expect(subiu.repsMin).toBe(20);
    expect(subiu.repsMax).toBe(20);
    const desceu = definirCampo(item, 'repsMax', 5);
    expect(desceu.repsMax).toBe(5);
    expect(desceu.repsMin).toBe(5);
  });
});

describe('PlanoEditor: reordenar dias', () => {
  it('arrastar um dia reordena a rotação e a aba selecionada continua sendo o mesmo dia', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(PlanoEditor);
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    const adicionar = tela.querySelector<HTMLButtonElement>('.novo-dia')!;
    adicionar.click(); // Treino B
    adicionar.click(); // Treino C, já selecionado
    fixture.detectChanges();

    const abas = () => [...tela.querySelectorAll('.dia .nome-aba')].map(a => a.textContent!.trim());
    expect(abas()).toEqual(['Treino A', 'Treino B', 'Treino C']);

    fixture.debugElement
      .query(By.directive(CdkDropList))
      .triggerEventHandler('cdkDropListDropped', { previousIndex: 2, currentIndex: 0 });
    fixture.detectChanges();

    expect(abas()).toEqual(['Treino C', 'Treino A', 'Treino B']);
    expect(tela.querySelector('.dia.sel .nome-aba')!.textContent!.trim()).toBe('Treino C');
  });
});
