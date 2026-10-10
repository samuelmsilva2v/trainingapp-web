import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ExerciciosApi } from '../../core/api';
import { Exercicio } from '../../core/modelos';
import { NovoExercicio } from './novo-exercicio';

const criado: Exercicio = {
  id: 'x1', nome: 'Meu supino', grupoMuscular: 'PEITO', equipamento: 'BARRA', personalizado: true, imagens: [],
};

describe('NovoExercicio', () => {
  function abrir() {
    const criar = vi.fn(() => of(criado));
    const close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ExerciciosApi, useValue: { criar } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(NovoExercicio);
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    const salvar = tela.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const digitar = (valor: string) => {
      const campo = tela.querySelector<HTMLInputElement>('input')!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    const escolher = (indice: number, valor: string) => {
      const select = tela.querySelectorAll<HTMLSelectElement>('select')[indice];
      select.value = valor;
      select.dispatchEvent(new Event('change'));
    };
    return { fixture, tela, salvar, digitar, escolher, criar, close };
  }

  it('só libera Salvar com nome, grupo e equipamento', () => {
    const { fixture, salvar, digitar, escolher } = abrir();
    expect(salvar.disabled).toBe(true);

    digitar('   ');
    escolher(0, 'PEITO');
    escolher(1, 'BARRA');
    fixture.detectChanges();
    expect(salvar.disabled).toBe(true); // nome só com espaços

    digitar('Meu supino');
    fixture.detectChanges();
    expect(salvar.disabled).toBe(false);
  });

  it('envia o exercício sem espaços sobrando e fecha devolvendo o criado', () => {
    const { fixture, tela, digitar, escolher, criar, close } = abrir();
    digitar('  Meu supino  ');
    escolher(0, 'PEITO');
    escolher(1, 'BARRA');
    fixture.detectChanges();

    tela.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(criar).toHaveBeenCalledWith({ nome: 'Meu supino', grupoMuscular: 'PEITO', equipamento: 'BARRA' });
    expect(close).toHaveBeenCalledWith(criado);
  });
});
