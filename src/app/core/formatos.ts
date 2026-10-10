const KG = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function formatarKg(valor: number): string {
  return KG.format(valor);
}

export function formatarCarga(valor: number | null): string {
  return valor === null ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/** Razão com 2 casas (ex.: 1,08), ou — quando não há base de comparação. */
export function formatarRazao(valor: number | null, sufixo = ''): string {
  return valor === null
    ? '—'
    : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + sufixo;
}

/** Minutos inteiros entre dois instantes ISO; sem fim, até agora. */
export function duracaoMinutos(inicio: string, fim: string | null): number {
  const ms = (fim ? new Date(fim).getTime() : Date.now()) - new Date(inicio).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** mm:ss ou h:mm:ss. */
export function cronometro(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dois = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`;
}

/** "Hoje", "Ontem" ou a data curta (ex.: "24 de out"). */
export function formatarDataRelativa(iso: string): string {
  const data = new Date(iso);
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicioDoDia(new Date()) - inicioDoDia(data)) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}
