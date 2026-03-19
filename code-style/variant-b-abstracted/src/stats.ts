export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

export function growthRate(prev: number, curr: number): number {
  return prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
}

export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return values[i];
    const slice = values.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
    return Math.round(avg * 100) / 100;
  });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
