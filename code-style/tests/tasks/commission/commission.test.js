const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const path = require("path");

const VARIANT_DIR = process.env.VARIANT_DIR;
const FIXTURES = path.resolve(__dirname, "../../../fixtures/sales.csv");

function runReport(reportType) {
  const entry = path.join(VARIANT_DIR, "dist/main.js");
  const output = execSync(`node "${entry}" "${FIXTURES}" ${reportType}`, {
    encoding: "utf-8",
  });
  return JSON.parse(output);
}

describe("Commission Report", () => {
  it("should be available as a report type", () => {
    const result = runReport("commission");
    assert.equal(result.report, "commission");
  });

  it("should include all salespeople", () => {
    const result = runReport("commission");
    const names = result.salespeople.map((s) => s.name).sort();
    assert.deepEqual(names, ["Alice", "Bob", "Charlie", "Diana"]);
  });

  it("should calculate monthly breakdown per salesperson", () => {
    const result = runReport("commission");
    const alice = result.salespeople.find((s) => s.name === "Alice");
    assert.ok(alice);
    assert.ok(alice.months);
    // Alice has sales in Jan, Feb, Mar, Apr, May, Jun
    assert.ok(Object.keys(alice.months).length >= 6);
  });

  it("should apply base 5% commission rate", () => {
    const result = runReport("commission");
    // Diana in Jan: 1500 → 5% = 75
    const diana = result.salespeople.find((s) => s.name === "Diana");
    assert.ok(diana);
    assert.equal(diana.months["2024-01"].sales, 1500);
    assert.equal(diana.months["2024-01"].commission, 75);
    assert.equal(diana.months["2024-01"].rate, 0.05);
  });

  it("should apply 8% tier for monthly sales > $10,000", () => {
    const result = runReport("commission");
    // Alice in Mar: 8200 + 4500 = 12700 → 8% = 1016
    const alice = result.salespeople.find((s) => s.name === "Alice");
    assert.ok(alice);
    assert.equal(alice.months["2024-03"].sales, 12700);
    assert.equal(alice.months["2024-03"].commission, 1016);
    assert.equal(alice.months["2024-03"].rate, 0.08);
  });

  it("should apply 12% tier for monthly sales > $50,000", () => {
    const result = runReport("commission");
    // Bob in Jun: 1700 + 52000 = 53700 → 12% = 6444
    const bob = result.salespeople.find((s) => s.name === "Bob");
    assert.ok(bob);
    assert.equal(bob.months["2024-06"].sales, 53700);
    assert.equal(bob.months["2024-06"].commission, 6444);
    assert.equal(bob.months["2024-06"].rate, 0.12);
  });

  it("should apply regional multipliers", () => {
    const result = runReport("commission");
    assert.ok(result.regionalMultipliers);
    // Should have multipliers for all 4 regions
    assert.ok(result.regionalMultipliers.North);
    assert.ok(result.regionalMultipliers.South);
    assert.ok(result.regionalMultipliers.East);
    assert.ok(result.regionalMultipliers.West);
  });

  it("should calculate quarterly totals", () => {
    const result = runReport("commission");
    const alice = result.salespeople.find((s) => s.name === "Alice");
    assert.ok(alice);
    assert.ok(alice.quarterly);
    assert.ok(alice.quarterly["Q1-2024"] !== undefined);
    assert.ok(alice.quarterly["Q2-2024"] !== undefined);

    // Q1 should be sum of Jan + Feb + Mar commissions (with regional multiplier)
    const q1Months = ["2024-01", "2024-02", "2024-03"];
    const q1Sum = q1Months.reduce((sum, m) => {
      const month = alice.months[m];
      if (!month) return sum;
      return sum + month.adjustedCommission;
    }, 0);
    assert.equal(alice.quarterly["Q1-2024"], q1Sum);
  });

  it("should include total commission per salesperson", () => {
    const result = runReport("commission");
    for (const sp of result.salespeople) {
      assert.ok(sp.totalCommission !== undefined);
      assert.ok(sp.totalCommission > 0);

      // Total should be sum of all adjusted monthly commissions
      const monthSum = Object.values(sp.months).reduce(
        (sum, m) => sum + m.adjustedCommission,
        0
      );
      assert.equal(sp.totalCommission, monthSum);
    }
  });
});
