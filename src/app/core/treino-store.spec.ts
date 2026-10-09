import { novoId } from './treino-store';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('novoId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gera um UUID v4 válido', () => {
    expect(novoId()).toMatch(UUID_V4);
  });

  it('gera UUID v4 mesmo sem crypto.randomUUID (http://IP, fora de contexto seguro)', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: <T extends ArrayBufferView>(a: T) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 50 }, () => novoId()));
    expect(ids.size).toBe(50);
    ids.forEach(id => expect(id).toMatch(UUID_V4));
  });
});
