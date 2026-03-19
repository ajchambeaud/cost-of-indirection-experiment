import { Row } from "./csv";

export function groupBy(rows: Row[], keyFn: (row: Row) => string): Record<string, Row[]> {
  const groups: Record<string, Row[]> = {};
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  return groups;
}

export function sumBy(rows: Row[], field: string): number {
  return rows.reduce((sum, row) => sum + parseFloat(row[field]), 0);
}

export function sumGroups(
  groups: Record<string, Row[]>,
  field: string
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, rows] of Object.entries(groups)) {
    result[key] = sumBy(rows, field);
  }
  return result;
}

export function topN(
  totals: Record<string, number>,
  n: number
): Array<{ name: string; total: number }> {
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, total]) => ({ name, total }));
}
