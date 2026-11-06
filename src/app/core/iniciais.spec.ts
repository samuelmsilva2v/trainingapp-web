import { iniciais } from './iniciais';

describe('iniciais', () => {
  it('primeiro nome e primeiro sobrenome, pulando da/de/do/das/dos/e', () => {
    expect(iniciais('Samuel Maciel da Silva', 's@x.com')).toBe('SM');
    expect(iniciais('Ana da Silva', 'a@x.com')).toBe('AS');
    expect(iniciais('Maria dos Santos e Souza', 'm@x.com')).toBe('MS');
    expect(iniciais('  João   de  Oliveira ', 'j@x.com')).toBe('JO');
  });

  it('um nome só dá uma letra; sem acento e em maiúsculas', () => {
    expect(iniciais('Samuel', 's@x.com')).toBe('S');
    expect(iniciais('élcio ávila', 'e@x.com')).toBe('EA');
  });

  it('nome vazio usa a primeira letra do e-mail', () => {
    expect(iniciais('', 'otavio@x.com')).toBe('O');
    expect(iniciais('   ', 'Ícaro@x.com')).toBe('I');
  });
});
