import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthStore, autenticadoGuard } from './auth';
import { autenticacaoInterceptor } from './auth.interceptor';
import { CofreRefresh } from './cofre';

const NAO_AUTORIZADO = { status: 401, statusText: 'Unauthorized' };

describe('login (AuthStore + interceptor)', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  let auth: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([autenticacaoInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthStore);
    vi.spyOn(auth, 'irParaEntrar').mockImplementation(() => undefined); // o real recarrega a página
  });

  afterEach(() => mock.verify());

  function entrar(token = 't1'): void {
    auth.entrar('a@b.com', 'senha').subscribe();
    mock.expectOne('/api/auth/login').flush({ acesso: token, expiraEmSegundos: 900 });
  }

  it('manda o Bearer na API e nos endpoints privados do login, mas não nos públicos', () => {
    entrar();
    expect(auth.logado()).toBe(true);

    http.get('/api/planos').subscribe();
    expect(mock.expectOne('/api/planos').request.headers.get('Authorization')).toBe('Bearer t1');

    http.post('/api/auth/trocar-senha', {}).subscribe();
    expect(mock.expectOne('/api/auth/trocar-senha').request.headers.get('Authorization')).toBe('Bearer t1');

    http.post('/api/auth/login', {}).subscribe();
    expect(mock.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('num 401 renova o token e repete a chamada com o token novo', () => {
    entrar();
    let resposta: unknown;
    http.get('/api/planos').subscribe(r => (resposta = r));

    mock.expectOne('/api/planos').flush({}, NAO_AUTORIZADO);
    mock.expectOne('/api/auth/refresh').flush({ acesso: 't2', expiraEmSegundos: 900 });
    const repetida = mock.expectOne('/api/planos');
    expect(repetida.request.headers.get('Authorization')).toBe('Bearer t2');
    repetida.flush(['ok']);

    expect(resposta).toEqual(['ok']);
    expect(auth.acesso).toBe('t2');
  });

  it('vários 401 ao mesmo tempo dividem uma única renovação', () => {
    entrar();
    http.get('/api/a').subscribe();
    http.get('/api/b').subscribe();

    mock.expectOne('/api/a').flush({}, NAO_AUTORIZADO);
    mock.expectOne('/api/b').flush({}, NAO_AUTORIZADO);
    mock.expectOne('/api/auth/refresh').flush({ acesso: 't2', expiraEmSegundos: 900 });

    mock.expectOne('/api/a').flush(1);
    mock.expectOne('/api/b').flush(2);
  });

  it('se o refresh também falha, volta ao login e devolve o erro original', () => {
    entrar();
    let erro: unknown;
    http.get('/api/planos').subscribe({ error: e => (erro = e) });

    mock.expectOne('/api/planos').flush({}, NAO_AUTORIZADO);
    mock.expectOne('/api/auth/refresh').flush({}, NAO_AUTORIZADO);

    expect(auth.irParaEntrar).toHaveBeenCalled();
    expect(auth.logado()).toBe(false);
    expect((erro as HttpErrorResponse).status).toBe(401);
  });

  it('erro que não é 401 passa direto, sem renovar', () => {
    entrar();
    let erro: unknown;
    http.get('/api/planos').subscribe({ error: e => (erro = e) });

    mock.expectOne('/api/planos').flush({}, { status: 500, statusText: 'Server Error' });

    expect((erro as HttpErrorResponse).status).toBe(500);
  });

  it('iniciar restaura o login pelo cookie; sem cookie válido fica deslogado e o guard manda para /entrar', async () => {
    const restaurando = auth.iniciar();
    mock.expectOne('/api/auth/refresh').flush({}, NAO_AUTORIZADO);
    await restaurando;

    expect(auth.logado()).toBe(false);
    const destino = TestBed.runInInjectionContext(() => autenticadoGuard({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(destino as UrlTree)).toBe('/entrar');

    const de_novo = auth.iniciar();
    mock.expectOne('/api/auth/refresh').flush({ acesso: 't9', expiraEmSegundos: 900 });
    await de_novo;
    expect(TestBed.runInInjectionContext(() => autenticadoGuard({} as never, {} as never))).toBe(true);
  });

  it('falta de rede ao restaurar não derruba nem trava o app', async () => {
    const restaurando = auth.iniciar();
    mock.expectOne('/api/auth/refresh').error(new ProgressEvent('error'));
    await restaurando;
    expect(auth.logado()).toBe(false);
  });
});

describe('login no app Android (refresh no corpo e no cofre)', () => {
  let mock: HttpTestingController;
  let auth: AuthStore;
  let cofre: { noApp: boolean; valor: string | null; carregar: () => Promise<void>; gravar: (v: string) => Promise<void>; apagar: () => Promise<void> };
  let guardado: string | null;

  beforeEach(() => {
    guardado = null;
    cofre = {
      noApp: true,
      valor: null,
      carregar: async () => void (cofre.valor = guardado),
      gravar: async v => void (cofre.valor = guardado = v),
      apagar: async () => void (cofre.valor = guardado = null),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([autenticacaoInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CofreRefresh, useValue: cofre },
      ],
    });
    mock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthStore);
  });

  afterEach(() => mock.verify());

  it('o login pede o refresh no corpo (X-Cliente), guarda no cofre e a renovação o manda no corpo', () => {
    auth.entrar('a@b.com', 'senha').subscribe();
    const login = mock.expectOne('/api/auth/login');
    expect(login.request.headers.get('X-Cliente')).toBe('android');
    login.flush({ acesso: 't1', expiraEmSegundos: 900, refresh: 'r1' });
    expect(guardado).toBe('r1');

    auth.renovar().subscribe();
    const renovar = mock.expectOne('/api/auth/refresh');
    expect(renovar.request.body).toEqual({ refresh: 'r1' });
    renovar.flush({ acesso: 't2', expiraEmSegundos: 900 });
    expect(guardado).toBe('r1'); // o refresh não rotaciona
  });

  it('ao abrir sem refresh guardado nem chama a API; com refresh, restaura o login', async () => {
    await auth.iniciar();
    expect(auth.logado()).toBe(false);

    guardado = 'r1';
    const restaurando = auth.iniciar();
    await vi.waitFor(() => mock.expectOne('/api/auth/refresh').flush({ acesso: 't9', expiraEmSegundos: 900 }));
    await restaurando;
    expect(auth.logado()).toBe(true);
  });

  it('refresh recusado apaga o que estava no cofre', async () => {
    guardado = 'vencido';
    const restaurando = auth.iniciar();
    await vi.waitFor(() => mock.expectOne('/api/auth/refresh').flush({}, NAO_AUTORIZADO));
    await restaurando;
    await vi.waitFor(() => expect(guardado).toBeNull());
    expect(auth.logado()).toBe(false);
  });
});
