import { Conquista } from './modelos';

/** Uma família de conquistas pronta para o Perfil: a faixa em destaque e o progresso com unidade. */
export interface FamiliaConquista {
  nome: string;
  /** Em ordem de faixa. */
  faixas: Conquista[];
  /** A próxima faixa a conquistar; na família completa, a última. */
  destaque: Conquista;
  completa: boolean;
  /** Família de uma faixa só (ex.: De volta): sem barra nem bolinhas. */
  unica: boolean;
  /** Ex.: "37/50 treinos", "melhor: 12/30 dias", "Nível 7/10". */
  progresso: string;
}

interface Unidade {
  prefixo?: string;
  sufixo?: string;
}

/**
 * Unidade do progresso pelo nome da família que a API manda. Sequência e Semanas firmes contam o melhor já alcançado
 * (por isso "melhor:"). shortcut: se a API renomear uma família, ela fica sem unidade ("12/30"); trocar por um campo da API.
 */
const UNIDADES: Record<string, Unidade> = {
  'Constância': { sufixo: 'treinos' },
  'Sequência': { prefixo: 'melhor: ', sufixo: 'dias' },
  'Semanas firmes': { prefixo: 'melhor: ', sufixo: 'semanas' },
  'Recordes': { sufixo: 'recordes' },
  'Recordes variados': { sufixo: 'exercícios' },
  'Nível': { prefixo: 'Nível ' },
};

function comUnidade(familia: string, valor: string): string {
  const u = UNIDADES[familia] ?? {};
  return `${u.prefixo ?? ''}${valor}${u.sufixo ? ' ' + u.sufixo : ''}`;
}

/** Meta de uma faixa com a unidade, para a lista expandida: "7 dias", "Nível 5", "50 treinos". */
export function metaComUnidade(familia: string, meta: number): string {
  return comUnidade(familia, String(meta)).replace(/^melhor: /, '');
}

/** Agrupa as faixas por família, na ordem em que a API manda. */
export function familias(conquistas: readonly Conquista[]): FamiliaConquista[] {
  const grupos = new Map<string, Conquista[]>();
  for (const c of conquistas) {
    const lista = grupos.get(c.familia) ?? [];
    lista.push(c);
    grupos.set(c.familia, lista);
  }
  return [...grupos].map(([nome, lista]) => {
    const faixas = [...lista].sort((a, b) => a.faixa - b.faixa);
    const proxima = faixas.find(c => !c.conquistada);
    const destaque = proxima ?? faixas[faixas.length - 1];
    return {
      nome,
      faixas,
      destaque,
      completa: !proxima,
      unica: faixas.length === 1,
      progresso: comUnidade(nome, `${destaque.progresso}/${destaque.meta}`),
    };
  });
}
