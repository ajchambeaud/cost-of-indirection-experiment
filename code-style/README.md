# Experiment 2: Code Style — Inline vs Abstracted

## Hypothesis

Software engineers refactor duplicated code into shared abstractions (DRY principle) to reduce maintenance burden. But if an AI agent is the one modifying the code, does DRY actually help? Or is duplicated-but-obvious code easier for the agent to extend — since it can just copy-paste and modify without needing to understand an abstraction layer?

## Experiment Design

### Independent Variable: Code Style

We implement the **same CLI data processing tool** in 2 variants with different code styles:

| Variant | Directory | Style | Files | Lines |
|---|---|---|---|---|
| A — Inline | `variant-a-inline/` | Duplicated, self-contained functions. Each report has its own CSV parsing, grouping, aggregation. Copy-paste with variations. | 1 | 284 |
| B — Abstracted | `variant-b-abstracted/` | DRY, shared utilities. `parseCSV()`, `groupBy()`, `sumGroups()`, `mean()`, `stdDev()`, etc. Reports are thin composable functions. | 8 | 235 |

Both variants produce **identical output** for all 4 report types and pass the **same 16 baseline tests**.

### What the tool does

A CLI that reads a CSV of sales data and generates reports:

```bash
node dist/main.js sales.csv <report-type>
```

| Report | Description |
|---|---|
| `revenue` | Totals by region, category, month |
| `trend` | Month-over-month growth, 3-month moving average |
| `anomaly` | Outliers > 2 standard deviations from mean |
| `ranking` | Top N products, regions, salespeople |

### What's duplicated in Variant A vs abstracted in Variant B

| Pattern | Variant A (Inline) | Variant B (Abstracted) |
|---|---|---|
| CSV parsing | 13-line block duplicated 4× | `parseCSV()` in `csv.ts` |
| Group-and-sum | 6-line block duplicated 8× | `groupBy()` + `sumGroups()` in `aggregations.ts` |
| Top-N sorting | Inline in ranking report | `topN()` in `aggregations.ts` |
| Mean, std dev | Inline in anomaly report | `mean()`, `stdDev()` in `stats.ts` |
| Growth rate, moving avg | Inline in trend report | `growthRate()`, `movingAverage()` in `stats.ts` |

### What's the same across both variants

- Same language (TypeScript)
- Same output format (JSON)
- Same CLI interface
- Same logic and calculations
- Same code quality (both are clean, well-named, readable)
- **Not an architecture difference** — variant B has utility files, not layers/patterns

### Task: Add a Commission Report

The agent is asked to add a new `commission` report type with:
- Base rate: 5% of monthly sales per salesperson
- Tiered rates: 8% for sales > $10K/month, 12% for > $50K/month
- Regional multipliers (North: 1.1, South: 1.0, East: 1.15, West: 0.95)
- Per-salesperson monthly breakdown + quarterly totals

This task requires understanding existing report patterns and implementing non-trivial business logic (tiered calculations, weighted multipliers, time-based aggregation).

### How we expect the agent to approach each variant

**Variant A:** Copy an existing report function (~60 lines), paste it, modify the logic. The CSV parsing and grouping patterns are right there to reuse. No need to understand external APIs.

**Variant B:** Create a new `reports/commission.ts` file, import shared utilities (`groupBy`, `sumBy`, etc.), compose them, and register the report in `main.ts`. Must understand the utility API but writes less code.

## Tech Stack

- TypeScript + Node.js (no external deps)
- CLI tool (no HTTP server)
- Node built-in test runner (`node --test`)

## Metrics

Same as experiment 1. See root README for full metrics documentation.

Key metrics extracted via `claude -p --output-format json`:
- `num_turns` — agent loop iterations
- `total_cost_usd` — dollar cost
- `duration_ms` — wall clock time
- `usage.output_tokens` — tokens written (code generation cost)
- `usage.cache_read_input_tokens` — tokens read (navigation cost)

Plus git-based metrics: files changed, new files created, lines added.
Plus test-based metrics: baseline pass (regression), task pass (feature correctness).

## Running the Experiment

```bash
cd code-style

# Test a variant manually
./run-tests.sh variant-a-inline              # baseline only
./run-tests.sh variant-a-inline commission   # baseline + task

# Run the full experiment
./run-experiment.sh commission all 5 sonnet 30
```

## Project Structure

```
code-style/
├── README.md                          ← this file
├── fixtures/
│   └── sales.csv                      ← sample data (38 rows)
├── tests/
│   ├── baseline/
│   │   └── reports.test.js            ← 16 tests for 4 existing reports
│   └── tasks/
│       └── commission/
│           └── commission.test.js     ← 9 tests for the commission feature
├── tasks/
│   └── commission.prompt.md           ← agent prompt
├── run-tests.sh                       ← build + test runner
├── run-experiment.sh                  ← full experiment automation
├── results/                           ← experiment results (gitignored)
├── variant-a-inline/                  ← 1 file, all logic duplicated
│   ├── src/main.ts                    ← 284 lines, 4 report functions
│   └── ...
└── variant-b-abstracted/              ← 8 files, shared utilities
    ├── src/main.ts                    ← 47 lines, CLI + dispatch
    ├── src/csv.ts                     ← parseCSV()
    ├── src/aggregations.ts            ← groupBy(), sumBy(), sumGroups(), topN()
    ├── src/stats.ts                   ← mean(), stdDev(), growthRate(), movingAverage()
    ├── src/reports/revenue.ts         ← 18 lines
    ├── src/reports/trend.ts           ← 31 lines
    ├── src/reports/anomaly.ts         ← 30 lines
    ├── src/reports/ranking.ts         ← 26 lines
    └── ...
```

## Results (Sonnet 4.6, 5 runs)

Full report: `results/commission/20260318-210726/REPORT.md`

| Variant | Turns | Cost | Time | Lines Added | New Files | Pass |
|---|---|---|---|---|---|---|
| A (Inline) | 7 | $0.13 | 61s | 86 | 0 | **5/5** |
| B (Abstracted) | 12 | $0.13 | 50s | 3 | 1 | **5/5** |

### Key Finding: Abstraction is cost-neutral

**Same cost, same success rate.** The agent adapts its strategy:
- In duplicated code → copy-paste-modify (more lines, fewer turns)
- In abstracted code → compose utilities (fewer lines, more turns)

The extra reading cost in variant B (understanding utilities) is offset by the reduced writing cost (shorter report code). Net result: identical cost.

### Combined insight with Experiment 1

**Abstraction ≠ indirection.** Shared utility functions (`groupBy`, `mean`) don't hurt the agent — they're cost-neutral. Architectural layers (ports → adapters → services → DI container) that force navigation across many files are what costs 2-3.5x more. The expensive thing isn't reuse, it's the number of files that must change for one feature.
