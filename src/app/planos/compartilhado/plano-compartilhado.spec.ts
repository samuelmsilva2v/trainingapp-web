import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { PlanoCompartilhado } from '../../core/modelos';
import { PlanoCompartilhadoTela } from './plano-compartilhado';

const PREVIA: PlanoCompartilhado = {
  nome: 'ABC',
  objetivo: 'HIPERTROFIA',
  compartilhadoPor: 'Samuel',
  seu: false,
  dias: [
    {
      nome: 'Treino A',
      exercicios: [
        { exercicioNome: 'Supino', grupoMuscular: 'PEITO', equipamento: 'BARRA', imagens: [], series: 4, repsMin: 8, repsMax: 12, descansoSegundos: 90, drops: 0 },
        { exercicioNome: 'Crucifixo', grupoMuscular: 'PEITO', equipamento: 'HALTERES', imagens: [], series: 3, repsMin: 6, repsMax: 6, descansoSegundos: null, drops: 2 },
      ],
    },
  ],
};

describe('PlanoCompartilhadoTela', () => {
  const navigateByUrl = vi.fn(() => Promise.resolve(true));

  function abrir() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'tok' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(PlanoCompartilhadoTela);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
  }

  const botao = (el: HTMLElement, texto: string) =>
    [...el.querySelectorAll('button')].find(b => b.textContent!.includes(texto))!;

  beforeEach(() => navigateByUrl.mockClear());

  it('mostra a prévia: nome, quem enviou, séries × reps, descanso e drop-set', () => {
    const { fixture, http, el } = abrir();
    http.expectOne('/api/compartilhados/tok').flush(PREVIA);
    fixture.detectChanges();

    const texto = el.textContent!;
    expect(texto).toContain('ABC');
    expect(texto).toContain('Compartilhado por Samuel');
    expect(texto).toContain('4 × 8–12');
    expect(texto).toContain('01:30');
    expect(texto).toContain('3 × 6');
    expect(el.querySelectorAll('.chip.drop')).toHaveLength(1);
  });

  it('o dono que abre o próprio link vê o aviso e não recebe a oferta de salvar', () => {
    const { fixture, http, el } = abrir();
    http.expectOne('/api/compartilhados/tok').flush({ ...PREVIA, seu: true });
    fixture.detectChanges();

    expect(el.textContent).toContain('Este plano é seu.');
    expect(el.textContent).not.toContain('Compartilhado por');
    expect(el.textContent).not.toContain('Salvar');
    botao(el, 'Voltar').click();
    expect(navigateByUrl).toHaveBeenCalled();
  });

  it('salvar e ativar manda ativar=true e vai para Planos; agora não volta para Hoje', () => {
    const { fixture, http, el } = abrir();
    http.expectOne('/api/compartilhados/tok').flush(PREVIA);
    fixture.detectChanges();

    botao(el, 'Salvar e ativar').click();
    const salvar = http.expectOne(r => r.url === '/api/compartilhados/tok/salvar');
    expect(salvar.request.method).toBe('POST');
    expect(salvar.request.params.get('ativar')).toBe('true');
    salvar.flush({ id: 'p1', nome: 'ABC', objetivo: 'HIPERTROFIA', ativo: true, dias: [] });
    expect(navigateByUrl).toHaveBeenCalledWith('/planos');

    botao(el, 'Agora não').click();
    expect(navigateByUrl).toHaveBeenCalledWith('/hoje');
  });

  it('link inexistente mostra "Link inválido ou removido"', () => {
    const { fixture, http, el } = abrir();
    http.expectOne('/api/compartilhados/tok').flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Link inválido ou removido');
    expect(el.querySelector('.fixo')).toBeNull();
  });
});
