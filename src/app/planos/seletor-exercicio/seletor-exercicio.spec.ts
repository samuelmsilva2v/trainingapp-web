import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ExerciciosApi } from '../../core/api';
import { Exercicio } from '../../core/modelos';
import { DadosSeletor, SeletorExercicio } from './seletor-exercicio';

const ex = (id: string, nome: string): Exercicio => ({
  id, nome, grupoMuscular: 'PEITO', equipamento: 'BARRA', personalizado: false, imagens: [],
});
const catalogo = [ex('a', 'Supino'), ex('b', 'Crucifixo'), ex('c', 'Remada')];

describe('SeletorExercicio', () => {
  afterEach(() => vi.useRealTimers());

  function abrir(dados: DadosSeletor | null, confirma = true) {
    vi.useFakeTimers();
    const close = vi.fn();
    const open = vi.fn(() => ({ afterClosed: () => of(confirma) }));
    TestBed.configureTestingModule({
      providers: [
        { provide: ExerciciosApi, useValue: { listar: () => of(catalogo) } },
        { provide: MatDialogRef, useValue: { close, keydownEvents: () => of() } },
        { provide: MatDialog, useValue: { open } },
        { provide: MAT_DIALOG_DATA, useValue: dados },
      ],
    });
    const fixture = TestBed.createComponent(SeletorExercicio);
    fixture.detectChanges();
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    const tocar = (nome: string) => {
      [...tela.querySelectorAll<HTMLButtonElement>('button.escolher')].find(b => b.textContent!.includes(nome))!.click();
      fixture.detectChanges();
    };
    const botao = (texto: string) => [...tela.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.includes(texto));
    const fecharX = () => tela.querySelector<HTMLButtonElement>('button[aria-label=Fechar]')!.click();
    return { fixture, tela, tocar, botao, fecharX, close, open };
  }

  it('sem seleção múltipla, o toque escolhe e fecha (trocar no treino)', () => {
    const { tocar, close } = abrir({ grupo: 'PEITO' });
    tocar('Crucifixo');
    expect(close).toHaveBeenCalledWith(catalogo[1]);
  });

  it('marca vários, desmarca no segundo toque e devolve na ordem dos toques', () => {
    const { tocar, botao, close, open } = abrir({ multiplo: true, noDia: [] });
    expect(botao('Adicionar (')).toBeUndefined();
    tocar('Remada');
    tocar('Supino');
    tocar('Crucifixo');
    tocar('Supino');
    expect(close).not.toHaveBeenCalled();
    botao('Adicionar (2)')!.click();
    expect(close).toHaveBeenCalledWith([catalogo[2], catalogo[1]]);
    expect(open).not.toHaveBeenCalled();
  });

  it('exercício que já está no dia só é marcado depois de confirmar', () => {
    const recusa = abrir({ multiplo: true, noDia: ['a'] }, false);
    recusa.tocar('Supino');
    expect(recusa.open).toHaveBeenCalledTimes(1);
    expect(recusa.botao('Adicionar (')).toBeUndefined();
    TestBed.resetTestingModule();

    const aceita = abrir({ multiplo: true, noDia: ['a'] });
    aceita.tocar('Supino');
    aceita.tocar('Supino'); // desmarcar não pergunta
    expect(aceita.open).toHaveBeenCalledTimes(1);
  });

  it('o X fecha direto sem seleção e pergunta com algo marcado', () => {
    const vazio = abrir({ multiplo: true, noDia: [] });
    vazio.fecharX();
    expect(vazio.open).not.toHaveBeenCalled();
    expect(vazio.close).toHaveBeenCalledWith();
    TestBed.resetTestingModule();

    const cheio = abrir({ multiplo: true, noDia: [] }, false);
    cheio.tocar('Remada');
    cheio.fecharX();
    expect(cheio.open).toHaveBeenCalledTimes(1);
    expect(cheio.close).not.toHaveBeenCalled(); // "Cancelar" mantém a seleção
    expect(cheio.botao('Adicionar (1)')).toBeDefined();
  });
});
