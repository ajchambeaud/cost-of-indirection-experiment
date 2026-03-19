import * as fs from "fs";
import * as path from "path";

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node main.js <csv-file> <report-type> [output-file]");
  console.error("Report types: revenue, trend, anomaly, ranking");
  process.exit(1);
}

const csvFile = args[0];
const reportType = args[1];
const outputFile = args[2] || null;

if (!fs.existsSync(csvFile)) {
  console.error(`File not found: ${csvFile}`);
  process.exit(1);
}

// ─── Revenue Report ──────────────────────────────────────────────────────────

function generateRevenueReport(csvPath: string): string {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  // By region
  const byRegion: Record<string, number> = {};
  for (const row of rows) {
    const region = row["region"];
    const amount = parseFloat(row["amount"]);
    byRegion[region] = (byRegion[region] || 0) + amount;
  }

  // By category
  const byCategory: Record<string, number> = {};
  for (const row of rows) {
    const category = row["category"];
    const amount = parseFloat(row["amount"]);
    byCategory[category] = (byCategory[category] || 0) + amount;
  }

  // By month
  const byMonth: Record<string, number> = {};
  for (const row of rows) {
    const month = row["date"].substring(0, 7);
    const amount = parseFloat(row["amount"]);
    byMonth[month] = (byMonth[month] || 0) + amount;
  }

  const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r["amount"]), 0);

  const result = {
    report: "revenue",
    totalRevenue,
    byRegion,
    byCategory,
    byMonth,
  };

  return JSON.stringify(result, null, 2);
}

// ─── Trend Report ────────────────────────────────────────────────────────────

function generateTrendReport(csvPath: string): string {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  // Monthly totals
  const monthlyTotals: Record<string, number> = {};
  for (const row of rows) {
    const month = row["date"].substring(0, 7);
    const amount = parseFloat(row["amount"]);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + amount;
  }

  const months = Object.keys(monthlyTotals).sort();
  const values = months.map((m) => monthlyTotals[m]);

  // Month-over-month growth
  const growth: Record<string, number> = {};
  for (let i = 1; i < months.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    growth[months[i]] = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  // 3-month moving average
  const movingAverage: Record<string, number> = {};
  for (let i = 0; i < months.length; i++) {
    if (i < 2) {
      movingAverage[months[i]] = values[i];
    } else {
      const avg = (values[i] + values[i - 1] + values[i - 2]) / 3;
      movingAverage[months[i]] = Math.round(avg * 100) / 100;
    }
  }

  const result = {
    report: "trend",
    monthlyTotals,
    growth,
    movingAverage,
  };

  return JSON.stringify(result, null, 2);
}

// ─── Anomaly Report ──────────────────────────────────────────────────────────

function generateAnomalyReport(csvPath: string): string {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  const amounts = rows.map((r) => parseFloat(r["amount"]));

  // Calculate mean
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

  // Calculate standard deviation
  const squaredDiffs = amounts.map((a) => (a - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  const threshold = mean + 2 * stdDev;

  // Find anomalies
  const anomalies: Array<{
    date: string;
    salesperson: string;
    region: string;
    product: string;
    amount: number;
    deviations: number;
  }> = [];

  for (const row of rows) {
    const amount = parseFloat(row["amount"]);
    if (amount > threshold) {
      anomalies.push({
        date: row["date"],
        salesperson: row["salesperson"],
        region: row["region"],
        product: row["product"],
        amount,
        deviations: Math.round(((amount - mean) / stdDev) * 100) / 100,
      });
    }
  }

  anomalies.sort((a, b) => b.amount - a.amount);

  const result = {
    report: "anomaly",
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    threshold: Math.round(threshold * 100) / 100,
    anomalies,
  };

  return JSON.stringify(result, null, 2);
}

// ─── Ranking Report ──────────────────────────────────────────────────────────

function generateRankingReport(csvPath: string): string {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  // Top products by total sales
  const productTotals: Record<string, number> = {};
  for (const row of rows) {
    const product = row["product"];
    const amount = parseFloat(row["amount"]);
    productTotals[product] = (productTotals[product] || 0) + amount;
  }
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  // Top regions by total sales
  const regionTotals: Record<string, number> = {};
  for (const row of rows) {
    const region = row["region"];
    const amount = parseFloat(row["amount"]);
    regionTotals[region] = (regionTotals[region] || 0) + amount;
  }
  const topRegions = Object.entries(regionTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  // Top salespeople by total sales
  const salespersonTotals: Record<string, number> = {};
  for (const row of rows) {
    const salesperson = row["salesperson"];
    const amount = parseFloat(row["amount"]);
    salespersonTotals[salesperson] = (salespersonTotals[salesperson] || 0) + amount;
  }
  const topSalespeople = Object.entries(salespersonTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  const result = {
    report: "ranking",
    topProducts,
    topRegions,
    topSalespeople,
  };

  return JSON.stringify(result, null, 2);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const reporters: Record<string, (csvPath: string) => string> = {
  revenue: generateRevenueReport,
  trend: generateTrendReport,
  anomaly: generateAnomalyReport,
  ranking: generateRankingReport,
};

if (!reporters[reportType]) {
  console.error(`Unknown report type: ${reportType}`);
  console.error(`Available: ${Object.keys(reporters).join(", ")}`);
  process.exit(1);
}

const output = reporters[reportType](csvFile);

if (outputFile) {
  fs.writeFileSync(outputFile, output);
  console.log(`Report written to ${outputFile}`);
} else {
  console.log(output);
}
