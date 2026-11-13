export interface FiltroColuna { valor?: string; inicio?: string; fim?: string; }
export type Filtros = Record<string, FiltroColuna>;

export const normalizar = (valor: unknown) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function filtrar<T extends object>(linhas: T[], filtros: Filtros, exatos: string[] = []): T[] {
  return linhas.filter(linha => Object.entries(filtros).every(([campo, filtro]) => {
    const valor = (linha as Record<string, unknown>)[campo];
    if (filtro.inicio || filtro.fim) {
      const dia = String(valor ?? '').slice(0, 10);
      if (!dia || (filtro.inicio && dia < filtro.inicio) || (filtro.fim && dia > filtro.fim)) return false;
    }
    return !filtro.valor || (exatos.includes(campo)
      ? String(valor ?? '') === filtro.valor
      : normalizar(valor).includes(normalizar(filtro.valor)));
  }));
}

export function valoresUnicos<T extends object>(linhas: T[], campo: keyof T): string[] {
  return [...new Set(linhas.map(linha => String(linha[campo] ?? '')).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}
