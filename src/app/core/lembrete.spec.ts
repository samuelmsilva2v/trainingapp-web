import { avisosDoLembrete } from './lembrete';

describe('lembrete de treino', () => {
  // Quarta-feira, 14/10/2026, 10:00 no fuso local.
  const agora = new Date(2026, 9, 14, 10, 0);
  const config = { ligado: true, hora: '18:00', dias: [1, 3, 5] }; // segunda, quarta e sexta

  it('agenda só nos dias marcados, no horário, nos próximos 14 dias', () => {
    const avisos = avisosDoLembrete(config, { proximoDia: 'Treino A', treinouEm: null }, agora);
    expect(avisos.map(a => a.quando.getDay())).toEqual([3, 5, 1, 3, 5, 1]);
    expect(avisos[0].quando).toEqual(new Date(2026, 9, 14, 18, 0));
    expect(new Set(avisos.map(a => a.id)).size).toBe(avisos.length);
  });

  it('pula hoje se já treinou ou se o horário já passou', () => {
    expect(avisosDoLembrete(config, { proximoDia: null, treinouEm: '2026-10-14' }, agora)[0].quando.getDay()).toBe(5);
    const tarde = new Date(2026, 9, 14, 19, 0);
    expect(avisosDoLembrete(config, { proximoDia: null, treinouEm: null }, tarde)[0].quando.getDay()).toBe(5);
  });

  it('desligado ou sem dias, nada', () => {
    expect(avisosDoLembrete({ ...config, ligado: false }, { proximoDia: null, treinouEm: null }, agora)).toEqual([]);
    expect(avisosDoLembrete({ ...config, dias: [] }, { proximoDia: null, treinouEm: null }, agora)).toEqual([]);
  });
});
