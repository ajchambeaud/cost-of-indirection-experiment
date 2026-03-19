# Variant B — Abstracted / DRY

## Philosophy

Shared patterns are extracted into reusable utilities. CSV parsing happens once, grouping/aggregation uses generic functions, statistical calculations are in a shared module. Each report is a thin file that **composes** these utilities.

This is the kind of code a human engineer would refactor towards: DRY, composable, with clear separation of concerns.

## Structure

```
src/
  main.ts              ← CLI + report dispatch (47 lines)
  csv.ts               ← parseCSV() utility (20 lines)
  aggregations.ts      ← groupBy(), sumBy(), sumGroups(), topN() (36 lines)
  stats.ts             ← mean(), stdDev(), growthRate(), movingAverage() (27 lines)
  reports/
    revenue.ts         ← uses aggregations (18 lines)
    trend.ts           ← uses aggregations + stats (31 lines)
    anomaly.ts         ← uses stats (30 lines)
    ranking.ts         ← uses aggregations (26 lines)
```

**8 files. 235 lines total** (vs 284 in variant A — the abstraction is slightly more compact).

## What's abstracted

### CSV parsing → `csv.ts`
The 13-line parsing block duplicated 4× in variant A is now a single `parseCSV()` function. Reports receive pre-parsed `Row[]` arrays.

### Group-and-sum → `aggregations.ts`
The 6-line group-and-sum pattern repeated 8× in variant A is now:
```ts
const byRegion = sumGroups(groupBy(rows, r => r["region"]), "amount");
```
Four generic functions handle all grouping/aggregation: `groupBy()`, `sumBy()`, `sumGroups()`, `topN()`.

### Stats → `stats.ts`
Mean, standard deviation, growth rate, and moving average are extracted as pure functions: `mean()`, `stdDev()`, `growthRate()`, `movingAverage()`, `round2()`.

### Reports → `reports/*.ts`
Each report is a thin function that composes the shared utilities. Revenue report is 18 lines (vs ~60 inline). The logic reads declaratively:
```ts
const byRegion = sumGroups(groupBy(rows, r => r["region"]), "amount");
const byCategory = sumGroups(groupBy(rows, r => r["category"]), "amount");
```

## Why this design for the experiment

This variant tests whether **DRY, abstracted code** helps or hurts an agent. To add a commission report, the agent must:
1. Understand the utility APIs (`groupBy`, `sumBy`, etc.)
2. Decide if existing utilities can express the commission logic (tiered rates, multipliers)
3. Possibly extend the utilities or write custom logic
4. Create a new report file and register it in `main.ts`

The agent needs to understand more context before it can act, but the building blocks might make the implementation shorter.
