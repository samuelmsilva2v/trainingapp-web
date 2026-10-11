import { criteriosDaSenha, forcaDaSenha, senhaForte } from './senha';

describe('senha forte', () => {
  it('exige 8+ caracteres, maiúscula, minúscula, número e símbolo', () => {
    expect(senhaForte('Senha-Forte-123!')).toBe(true);
    expect(senhaForte('Aa1!aaaa')).toBe(true);
    expect(senhaForte('Aa1!aaa')).toBe(false); // 7 caracteres
    expect(senhaForte('sem-maiuscula-1!')).toBe(false);
    expect(senhaForte('SEM-MINUSCULA-1!')).toBe(false);
    expect(senhaForte('Sem-Numero-Aqui!')).toBe(false);
    expect(senhaForte('SemSimbolo123')).toBe(false);
    expect(senhaForte('')).toBe(false);
  });

  it('acentos contam como letra e espaço conta como símbolo, como na API', () => {
    expect(senhaForte('Çedilha Ñ 7 ç')).toBe(true);
    expect(senhaForte('Maçã1234')).toBe(false); // sem símbolo
  });

  it('lista o que já foi atendido', () => {
    expect(criteriosDaSenha('abc').map(c => c.ok)).toEqual([false, false, false, false]);
    expect(criteriosDaSenha('Abcdefgh1').map(c => [c.rotulo, c.ok])).toEqual([
      ['8+ caracteres', true], ['Maiúscula e minúscula', true], ['Número', true], ['Símbolo', false],
    ]);
  });

  it('o medidor vai de fraca a forte conforme os critérios', () => {
    expect(forcaDaSenha('')).toEqual({ nivel: 0, rotulo: 'FRACA' });
    expect(forcaDaSenha('abcdefghi')).toEqual({ nivel: 1, rotulo: 'FRACA' });
    expect(forcaDaSenha('abcdefghi1')).toEqual({ nivel: 2, rotulo: 'MÉDIA' });
    expect(forcaDaSenha('Abcdefghi1')).toEqual({ nivel: 3, rotulo: 'MÉDIA' });
    expect(forcaDaSenha('Abcdefghi1!')).toEqual({ nivel: 4, rotulo: 'FORTE' });
  });
});
