import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { GamificacaoApi, PerfilApi } from '../../core/api';
import { Gamificacao, Perfil } from '../../core/modelos';
import { lerTema } from '../../core/tema';
import { TemasTela } from './temas';

const gamificacao = (nivel: number, xpTotal: number) => ({ nivel, xpTotal, xpInicioDoNivel: 0, xpProximoNivel: 0, conquistas: [] }) as unknown as Gamificacao;

describe('TemasTela', () => {
  let escolherTema: ReturnType<typeof vi.fn>;

  function abrir(nivel: number, xp: number, resposta = of({} as Perfil)) {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined); // o jsdom não implementa
    escolherTema = vi.fn(() => resposta);
    TestBed.configureTestingModule({
      providers: [
        { provide: PerfilApi, useValue: { escolherTema } },
        { provide: GamificacaoApi, useValue: { resumo: () => of(gamificacao(nivel, xp)) } },
      ],
    });
    const fixture = TestBed.createComponent(TemasTela);
    fixture.detectChanges();
    const tela = fixture.nativeElement as HTMLElement;
    const card = (nome: string) => [...tela.querySelectorAll<HTMLButtonElement>('.card-tema')].find(b => b.querySelector('.nome')!.textContent!.trim().startsWith(nome))!;
    return { fixture, tela, card };
  }

  it('um card por tema, na ordem de desbloqueio, com os bloqueados dizendo o nível e o XP que falta', () => {
    const { tela, card } = abrir(4, 1048);
    const nomes = [...tela.querySelectorAll('.card-tema .nome > span:first-child')].map(n => n.textContent!.trim());
    expect(nomes).toEqual(['Escuro', 'Claro', 'Chrome', 'Electric', 'Ignite', 'Commando Jungle', 'Commando Desert', 'Cyberpunk',
      'Sakura', 'Hokusai', 'Sumi-e']);
    expect(tela.querySelector('.intro')!.textContent).toContain('2 de 11 liberados');
    expect(card('Escuro').getAttribute('aria-pressed')).toBe('true');
    expect(card('Escuro').textContent).toContain('Em uso');
    // Só o primeiro travado leva "PRÓXIMO"; os outros, o cadeado com o nível.
    expect(card('Chrome').querySelector('.selo-proximo')).not.toBeNull();
    expect(card('Electric').querySelector('.selo-proximo')).toBeNull();
    expect(card('Commando Desert').getAttribute('aria-label')).toBe('Commando Desert, libera no nível 20, faltam 7.897 XP');
  });

  it('tocar num liberado aplica e grava na conta; num bloqueado só avisa', () => {
    const { fixture, card } = abrir(20, 9000);
    const aviso = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    card('Commando Desert').click();
    fixture.detectChanges();
    expect(lerTema()).toBe('commando-deserto');
    expect(escolherTema).toHaveBeenCalledWith('commando-deserto');
    expect(card('Commando Desert').getAttribute('aria-pressed')).toBe('true');

    card('Cyberpunk').click();
    expect(lerTema()).toBe('commando-deserto');
    expect(aviso).toHaveBeenCalledWith('Chegue ao nível 25 para liberar este tema.', 'OK', { duration: 4000 });
  });

  it('se a conta não gravar, o tema fica no aparelho e avisa', () => {
    const resposta = new Subject<Perfil>();
    const { card } = abrir(10, 3500, resposta);
    const aviso = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    card('Electric').click();
    resposta.error(new Error('rede'));
    expect(lerTema()).toBe('electric');
    expect(aviso).toHaveBeenCalledWith('Não deu para salvar o tema na conta: ele ficou só neste aparelho.', 'OK', { duration: 5000 });
  });
});
