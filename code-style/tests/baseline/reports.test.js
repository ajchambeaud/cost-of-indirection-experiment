const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const path = require("path");

const VARIANT_DIR = process.env.VARIANT_DIR;
const FIXTURES = path.resolve(__dirname, "../../fixtures/sales.csv");

function runReport(reportType) {
  const entry = path.join(VARIANT_DIR, "dist/main.js");
  const output = execSync(`node "${entry}" "${FIXTURES}" ${reportType}`, {
    encoding: "utf-8",
  });
  return JSON.parse(output);
}

describe("Revenue Report", () => {
  it("should return correct report type", () => {
    const result = runReport("revenue");
    assert.equal(result.report, "revenue");
  });

  it("should calculate total revenue", () => {
    const result = runReport("revenue");
    assert.equal(result.totalRevenue, 211550);
  });

  it("should break down by region", () => {
    const result = runReport("revenue");
    assert.equal(result.byRegion.North, 72600);
    assert.equal(result.byRegion.South, 75950);
    assert.equal(result.byRegion.East, 47300);
    assert.equal(result.byRegion.West, 15700);
  });

  it("should break down by category", () => {
    const result = runReport("revenue");
    assert.equal(result.byCategory.Electronics, 179300);
    assert.equal(result.byCategory.Home, 32250);
  });

  it("should break down by month", () => {
    const result = runReport("revenue");
    assert.equal(result.byMonth["2024-01"], 9200);
    assert.equal(result.byMonth["2024-06"], 93100);
  });
});

describe("Trend Report", () => {
  it("should return monthly totals", () => {
    const result = runReport("trend");
    assert.equal(result.report, "trend");
    assert.equal(result.monthlyTotals["2024-01"], 9200);
  });

  it("should calculate month-over-month growth", () => {
    const result = runReport("trend");
    assert.ok(result.growth["2024-02"] !== undefined);
    // Feb (12750) vs Jan (9200) = ~38.6% growth
    assert.ok(Math.abs(result.growth["2024-02"] - 38.59) < 1);
  });

  it("should calculate 3-month moving average", () => {
    const result = runReport("trend");
    assert.ok(result.movingAverage["2024-03"] !== undefined);
    // Avg of Jan(9200) + Feb(12750) + Mar(35500) = 19150
    assert.equal(result.movingAverage["2024-03"], 19150);
  });
});

describe("Anomaly Report", () => {
  it("should calculate statistics", () => {
    const result = runReport("anomaly");
    assert.equal(result.report, "anomaly");
    assert.equal(result.mean, 5567.11);
    assert.equal(result.stdDev, 8360.37);
  });

  it("should detect outliers above 2 std deviations", () => {
    const result = runReport("anomaly");
    assert.ok(result.anomalies.length >= 1);
    // Bob's 52000 sale should be flagged
    const bobAnomaly = result.anomalies.find(
      (a) => a.salesperson === "Bob" && a.amount === 52000
    );
    assert.ok(bobAnomaly);
    assert.ok(bobAnomaly.deviations > 2);
  });

  it("should sort anomalies by amount descending", () => {
    const result = runReport("anomaly");
    for (let i = 1; i < result.anomalies.length; i++) {
      assert.ok(result.anomalies[i - 1].amount >= result.anomalies[i].amount);
    }
  });
});

describe("Ranking Report", () => {
  it("should return top products", () => {
    const result = runReport("ranking");
    assert.equal(result.report, "ranking");
    assert.ok(result.topProducts.length > 0);
    assert.ok(result.topProducts[0].total >= result.topProducts[1].total);
  });

  it("should return top regions", () => {
    const result = runReport("ranking");
    assert.ok(result.topRegions.length > 0);
    // South should be #1 with 75950
    assert.equal(result.topRegions[0].name, "South");
    assert.equal(result.topRegions[0].total, 75950);
  });

  it("should return top salespeople", () => {
    const result = runReport("ranking");
    assert.ok(result.topSalespeople.length > 0);
    // Bob should be #1 with 75950 (includes the 52K outlier sale)
    assert.equal(result.topSalespeople[0].name, "Bob");
    assert.equal(result.topSalespeople[0].total, 75950);
  });
});

describe("CLI behavior", () => {
  it("should exit with error for unknown report type", () => {
    const entry = path.join(VARIANT_DIR, "dist/main.js");
    assert.throws(() => {
      execSync(`node "${entry}" "${FIXTURES}" nonexistent`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    });
  });

  it("should write to output file when specified", () => {
    const entry = path.join(VARIANT_DIR, "dist/main.js");
    const tmpFile = `/tmp/test-report-${Date.now()}.json`;
    execSync(`node "${entry}" "${FIXTURES}" revenue "${tmpFile}"`, {
      encoding: "utf-8",
    });
    const fs = require("fs");
    const content = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    assert.equal(content.report, "revenue");
    fs.unlinkSync(tmpFile);
  });
});
