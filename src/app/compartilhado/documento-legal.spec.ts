import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { DocumentoLegal } from './documento-legal';

describe('DocumentoLegal', () => {
  it('como página, mostra o documento da rota', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { tipo: 'privacidade' } } } }],
    });
    const fixture = TestBed.createComponent(DocumentoLegal);
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    expect(tela.querySelector('h1')!.textContent).toBe('Política de Privacidade');
    expect(tela.textContent).toContain('Lei 13.709/2018');
    expect(tela.querySelector('[aria-label=Voltar]')).not.toBeNull();
  });

  it('no diálogo, o link para o outro documento troca o texto no lugar e fechar fecha o diálogo', () => {
    const close = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MAT_DIALOG_DATA, useValue: 'termos' }, { provide: MatDialogRef, useValue: { close } }],
    });
    const fixture = TestBed.createComponent(DocumentoLegal);
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    expect(tela.querySelector('h1')!.textContent).toBe('Termos de Uso');

    tela.querySelector<HTMLAnchorElement>('a[href="/privacidade"]')!.click();
    fixture.detectChanges();
    expect(tela.querySelector('h1')!.textContent).toBe('Política de Privacidade');

    tela.querySelector<HTMLButtonElement>('[aria-label=Fechar]')!.click();
    expect(close).toHaveBeenCalled();
  });
});
