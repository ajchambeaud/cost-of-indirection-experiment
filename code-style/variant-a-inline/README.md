# Variant A — Inline / Duplicated

## Philosophy

Every report function is **fully self-contained**. Each one reads the CSV, parses it, does its own grouping/aggregation, and produces output. No shared utilities, no abstractions. If two reports need "group by month", they each have their own implementation.

This is the kind of code an AI agent often produces: functional, correct, but with obvious duplication.

## Structure

```
src/
  main.ts    ← everything: CLI, CSV parsing (×4), all 4 report functions (284 lines)
```

**1 file. 284 lines.**

## What's duplicated

### CSV parsing — repeated 4 times (lines 25-37, 79-91, 136-148, 202-214)
Each report function starts with the exact same 13-line block:
```ts
const raw = fs.readFileSync(csvPath, "utf-8");
const lines = raw.trim().split("\n");
const headers = lines[0].split(",");
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(",");
  const row = {};
  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = values[j];
  }
  rows.push(row);
}
```

### Group-and-sum pattern — repeated 8 times
The pattern "iterate rows, group by key, sum amounts" appears in revenue (×3 for region/category/month), ranking (×3 for product/region/salesperson), trend (×1), and anomaly (×1):
```ts
const byRegion: Record<string, number> = {};
for (const row of rows) {
  const region = row["region"];
  const amount = parseFloat(row["amount"]);
  byRegion[region] = (byRegion[region] || 0) + amount;
}
```

### Stats calculations — inlined
Mean, standard deviation, and sorting are implemented inline in the anomaly and trend reports rather than extracted.

## Why this design for the experiment

This variant tests whether **obvious, duplicated code** is easier for an agent to extend. To add a commission report, the agent can:
1. Copy any existing report function
2. Modify the copy
3. Register it in the `reporters` map

No need to understand abstractions, utility APIs, or how pieces compose.
