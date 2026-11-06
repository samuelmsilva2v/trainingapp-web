import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogState } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { IntegracaoAndroid } from '../core/android';
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
  let fixture: ComponentFixture<Treino>;

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
    fixture = TestBed.createComponent(Treino);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  /** Fechar espera a animação: basta o diálogo ter saído do estado aberto. */
  const aberto = () => TestBed.inject(MatDialog).openDialogs.some(d => d.getState() === MatDialogState.OPEN);
  const visor = () => document.querySelector('app-ver-fotos');
  const botao = (rotulo: string) => visor()?.querySelector<HTMLButtonElement>(`[aria-label="${rotulo}"]`);
  async function atualizar() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => TestBed.inject(MatDialog).closeAll());

  it('tocar numa foto abre o visualizador nela; as setas trocam e o X fecha', async () => {
    const tela = abrir(['http://img/a/0.jpg', 'http://img/a/1.jpg']);
    tela.querySelectorAll<HTMLButtonElement>('.fotos .foto')[1].click();
    await atualizar();

    expect(visor()?.textContent).toContain('Supino');
    expect(visor()?.textContent).toContain('2/2');
    botao('Foto anterior')!.click();
    await atualizar();
    expect(visor()?.textContent).toContain('1/2');

    botao('Fechar')!.click();
    await atualizar();
    expect(aberto()).toBe(false);
  });

  it('o voltar do Android fecha o visualizador sem sair do treino', async () => {
    const tela = abrir(['http://img/a/0.jpg', 'http://img/a/1.jpg']);
    tela.querySelector<HTMLButtonElement>('.fotos .foto')!.click();
    await atualizar();
    expect(aberto()).toBe(true);

    TestBed.inject(IntegracaoAndroid).voltar(true);
    await atualizar();
    expect(aberto()).toBe(false);
    expect(tela.querySelector('.fotos img')).not.toBeNull();
  });

  it('foto que falha no visualizador sai da lista, sem setas', async () => {
    const tela = abrir(['http://img/a/0.jpg', 'http://img/a/1.jpg']);
    tela.querySelector<HTMLButtonElement>('.fotos .foto')!.click();
    await atualizar();
    visor()!.querySelectorAll('img')[1].dispatchEvent(new Event('error'));
    await atualizar();

    expect(visor()?.querySelectorAll('img').length).toBe(1);
    expect(botao('Próxima foto')).toBeNull();
  });

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

describe('Treino: peso corporal', () => {
  it('o card só tem reps: sem stepper nem coluna de carga, com o chip "Peso corporal"', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessoesApi, useValue: { anteriores: () => of([]), salvar: (s: SessaoLocal) => of(s) } },
      ],
    });
    const s = sessao();
    s.exercicios[0] = { ...s.exercicios[0], nome: 'Barra fixa', equipamento: 'PESO_CORPORAL', series: [{ id: 'r1', reps: 8, carga: null, concluida: false }] };
    TestBed.inject(TreinoStore).retomar(s);
    const fixture = TestBed.createComponent(Treino);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[aria-label="Repetições"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Carga em quilos"]')).toBeNull();
    expect(el.querySelector('.cabecalho-tabela')?.textContent).not.toContain('Carga');
    expect(el.querySelector('.chip.peso')?.textContent).toContain('Peso corporal');
  });
});

describe('Treino: reabrir no meio do treino (web#62)', () => {
  function abrirCom(fimDescanso: number) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessoesApi, useValue: { anteriores: () => of([]), salvar: (s: SessaoLocal) => of(s) } },
      ],
    });
    const s = sessao();
    s.exercicios.push({ ...s.exercicios[0], id: 'e2', exercicioId: 'x2', nome: 'Remada' });
    const store = TestBed.inject(TreinoStore);
    store.retomar(s);
    store.gravarTela({ indice: 1, descanso: { fim: fimDescanso, total: 90, texto: 'Supino, série 1' } });
    const fixture = TestBed.createComponent(Treino);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, store, fixture };
  }

  afterEach(() => localStorage.clear());

  it('volta ao exercício e ao descanso em que estava', () => {
    const { el } = abrirCom(Date.now() + 60_000);
    expect(el.querySelector('.ex-nome h2')?.textContent).toContain('Remada');
    expect(el.querySelector('[role="timer"][aria-label="Descanso"]')).not.toBeNull();
  });

  it('descanso que venceu com o app fechado não volta; sair da tela encerra o descanso gravado', () => {
    const { el, store, fixture } = abrirCom(Date.now() - 1000);
    expect(el.querySelector('.ex-nome h2')?.textContent).toContain('Remada');
    expect(el.querySelector('[role="timer"]')).toBeNull();

    store.gravarTela({ indice: 1, descanso: { fim: Date.now() + 60_000, total: 90, texto: 'x' } });
    fixture.destroy();
    expect(store.lerTela()).toEqual({ indice: 1, descanso: null });
  });
});
