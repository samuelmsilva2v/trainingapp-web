import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Gamificacao, SessaoLocal } from '../core/modelos';
import { ResultadoDados, ResultadoTreino } from './resultado-treino';

const gamificacao = (over: Partial<Gamificacao>): Gamificacao => ({
  xpTotal: 250, nivel: 1, xpInicioDoNivel: 0, xpProximoNivel: 283, streakAtual: 2, melhorStreak: 2,
  treinos: 2, recordes: 0, treinouHoje: true,
  conquistas: [{ codigo: 'PRIMEIRO_TREINO', nome: 'Primeiro treino', descricao: '', conquistada: true }],
  ...over,
});

const sessao = (over: Partial<SessaoLocal>): SessaoLocal => ({
  id: 's', planoId: null, planoNome: 'ABC', diaNome: 'Push', diaOrdem: 0, estado: 'CONCLUIDA',
  iniciadaEm: '', finalizadaEm: '', atualizadoEm: '',
  exercicios: [{
    id: 'e', exercicioId: 'x1', nome: 'Supino reto', grupoMuscular: 'PEITO', equipamento: 'BARRA',
    metaSeries: 3, metaRepsMin: 8, metaRepsMax: 12, metaCarga: 60, metaDescansoSegundos: null,
    series: [8, 8, 8].map((reps, i) => ({ id: `r${i}`, reps, carga: 70, concluida: true })),
  }],
  ...over,
});

const comXpPorExercicio = (s: SessaoLocal, xp: number): SessaoLocal => {
  s.exercicios[0].xp = xp;
  return s;
};

function abrir(dados: ResultadoDados): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: dados },
      { provide: MatDialogRef, useValue: { close: () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(ResultadoTreino);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ResultadoTreino', () => {
  it('mostra o XP com o detalhe, o nível novo, o recorde e a conquista nova', () => {
    const el = abrir({
      sessao: comXpPorExercicio(sessao({ xpGanho: 90, xpSeries: 65, xpRecordes: 25, recordes: ['x1'] }), 65),
      antes: gamificacao({ xpTotal: 250, nivel: 1 }),
      depois: gamificacao({
        xpTotal: 340, nivel: 2, xpInicioDoNivel: 283, xpProximoNivel: 520,
        conquistas: [
          { codigo: 'PRIMEIRO_TREINO', nome: 'Primeiro treino', descricao: '', conquistada: true },
          { codigo: 'PRIMEIRO_RECORDE', nome: 'Primeiro recorde', descricao: '', conquistada: true },
        ],
      }),
    });
    const texto = el.textContent ?? '';

    expect(texto).toContain('+90 XP');
    expect(texto).toContain('+65');
    expect(texto).toContain('+25');
    expect(texto).toContain('Subiu para o nível 2!');
    expect(texto).toContain('faltam 180 XP para o nível 3');
    expect(texto).toContain('Supino reto');
    expect(texto).toContain('Primeiro recorde');
    expect(texto).not.toContain('Nova conquista Primeiro treino');
    expect(texto).toContain('3/3 · 65 XP'); // XP do exercício, em vez da melhor carga
    expect(texto).toContain('🏆');
    expect(texto).not.toContain('melhor');
  });

  it('sem recorde não mostra o troféu', () => {
    const el = abrir({ sessao: comXpPorExercicio(sessao({ xpGanho: 36, xpSeries: 36, recordes: [] }), 36), antes: null, depois: gamificacao({}) });
    expect(el.textContent).toContain('3/3 · 36 XP');
    expect(el.textContent).not.toContain('🏆');
  });

  it('mostra o bônus da sequência à parte: XP do treino em destaque, linha da sequência e o total', () => {
    const el = abrir({
      sessao: comXpPorExercicio(sessao({ xpGanho: 51, xpSeries: 36, xpStreak: 15, recordes: [] }), 36),
      antes: null,
      depois: gamificacao({ streakAtual: 4 }),
    });
    const texto = el.textContent ?? '';

    expect(el.querySelector('.grande')?.textContent).toContain('+36 XP'); // 51 − 15
    expect(texto).toContain('+15 bônus');
    expect(texto).toContain('Sequência (4 dias)');
    expect(texto).toContain('Total');
    expect(texto).toContain('+51');
    expect(el.querySelector('.metricas dd')?.textContent).toBe('36');
  });

  it('sem bônus não mostra sequência nem total à parte', () => {
    const el = abrir({ sessao: comXpPorExercicio(sessao({ xpGanho: 36, xpSeries: 36, recordes: [] }), 36), antes: null, depois: gamificacao({}) });
    expect(el.querySelector('.grande')?.textContent).toContain('+36 XP');
    expect(el.textContent).not.toContain('bônus');
    expect(el.textContent).not.toContain('Total');
  });

  it('explica por que não rendeu XP: poucas séries ou já treinou no dia', () => {
    const poucas = sessao({ xpGanho: 0 });
    poucas.exercicios[0].series = poucas.exercicios[0].series.slice(0, 2);
    expect(abrir({ sessao: poucas, antes: null, depois: gamificacao({}) }).textContent)
      .toContain('menos de 3 séries');

    TestBed.resetTestingModule();
    expect(abrir({ sessao: sessao({ xpGanho: 0 }), antes: null, depois: gamificacao({}) }).textContent)
      .toContain('Só o primeiro treino do dia rende XP.');
  });
});
