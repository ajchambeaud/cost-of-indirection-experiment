import { Row } from "../csv";
import { mean, stdDev, round2 } from "../stats";

export function generateAnomalyReport(rows: Row[]): object {
  const amounts = rows.map((r) => parseFloat(r["amount"]));

  const avg = mean(amounts);
  const sd = stdDev(amounts);
  const threshold = avg + 2 * sd;

  const anomalies = rows
    .filter((r) => parseFloat(r["amount"]) > threshold)
    .map((r) => ({
      date: r["date"],
      salesperson: r["salesperson"],
      region: r["region"],
      product: r["product"],
      amount: parseFloat(r["amount"]),
      deviations: round2((parseFloat(r["amount"]) - avg) / sd),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    report: "anomaly",
    mean: round2(avg),
    stdDev: round2(sd),
    threshold: round2(threshold),
    anomalies,
  };
}
