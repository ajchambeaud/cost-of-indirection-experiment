import { Row } from "../csv";
import { groupBy, sumGroups } from "../aggregations";
import { growthRate, movingAverage } from "../stats";

export function generateTrendReport(rows: Row[]): object {
  const monthlyTotals = sumGroups(
    groupBy(rows, (r) => r["date"].substring(0, 7)),
    "amount"
  );

  const months = Object.keys(monthlyTotals).sort();
  const values = months.map((m) => monthlyTotals[m]);

  const growth: Record<string, number> = {};
  for (let i = 1; i < months.length; i++) {
    growth[months[i]] = growthRate(values[i - 1], values[i]);
  }

  const maValues = movingAverage(values, 3);
  const ma: Record<string, number> = {};
  months.forEach((m, i) => {
    ma[m] = maValues[i];
  });

  return {
    report: "trend",
    monthlyTotals,
    growth,
    movingAverage: ma,
  };
}
