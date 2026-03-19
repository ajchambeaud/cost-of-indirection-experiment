import * as fs from "fs";
import { parseCSV, Row } from "./csv";
import { generateRevenueReport } from "./reports/revenue";
import { generateTrendReport } from "./reports/trend";
import { generateAnomalyReport } from "./reports/anomaly";
import { generateRankingReport } from "./reports/ranking";

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

const rows = parseCSV(csvFile);

const reporters: Record<string, (data: Row[]) => object> = {
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

const result = reporters[reportType](rows);
const output = JSON.stringify(result, null, 2);

if (outputFile) {
  fs.writeFileSync(outputFile, output);
  console.log(`Report written to ${outputFile}`);
} else {
  console.log(output);
}
