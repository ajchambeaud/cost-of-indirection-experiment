# Complexity Test: Do Clean Code Abstractions Help Coding Agents?

## Hypothesis

Software engineering best practices (abstractions, clean code, architecture patterns) evolved for **human cognition**. This experiment tests whether those same practices help, hurt, or are neutral when the code is being written and modified by **LLM-based coding agents** (Claude Code).

## Methodology

Each experiment implements the **same functionality** in multiple code variants, then gives a Claude Code agent a feature task and measures cost, speed, success rate, and edit dispersion.

- Run each task **3-5 times** per variant (LLM output is non-deterministic)
- Report **medians** (not means — outliers are common)
- Metrics extracted from `claude -p --output-format json`: turns, cost, duration, tokens
- Supplementary metrics from git: files changed, lines added, new files

Each experiment lives in its own directory with its own `run-experiment.sh` and `run-tests.sh`.

## Project Structure

```
complexity_test/
├── README.md                    ← this file
├── architecture/                ← experiment 1: architecture complexity
│   ├── run-experiment.sh        ← full experiment automation
│   ├── run-tests.sh             ← test runner script
│   ├── package.json             ← test runner deps
│   ├── e2e/                     ← shared e2e test suite (30 baseline + 11 task tests)
│   ├── tasks/                   ← agent task prompts
│   ├── results/                 ← experiment results (gitignored)
│   ├── variant-1-flat/          ← single file, everything inline
│   ├── variant-2-structured/    ← single file, classes and functions
│   ├── variant-3-multi-light/   ← multi-file, split by concern
│   ├── variant-4-multi-arch/    ← full architecture (repos, services, DTOs, DI)
│   └── variant-5-hexagonal/     ← ports & adapters with TS interfaces
└── code-style/                  ← experiment 2: code style (inline vs abstracted)
    ├── run-experiment.sh
    ├── run-tests.sh
    ├── fixtures/                ← sample data
    ├── tests/                   ← 16 baseline + 9 task tests
    ├── tasks/
    ├── variant-a-inline/        ← 1 file, all logic duplicated
    └── variant-b-abstracted/    ← 8 files, shared utilities
```

## Experiment 1: Architecture Complexity

**Question:** Does increasing architectural abstraction help or hurt an AI coding agent?

We implement a **Wallet/Money Transfer API** (Express + SQLite) in 5 variants with increasing abstraction, from a single flat file to full hexagonal architecture. All 5 expose the same API and pass the same 30 e2e tests.

**Task:** Add multi-currency support with conversion rates — a cross-cutting change that touches accounts, transfers, and history.

```bash
cd architecture/
./run-experiment.sh multi-currency all 3 sonnet 30
```


## Experiment 2: Code Style — Inline vs Abstracted

**Question:** Does duplicated (copy-paste) code help or hurt agent performance vs DRY abstractions?

We implement a **CLI data processing tool** (TypeScript, no HTTP) in 2 variants: one with all logic duplicated per report, one with shared utility functions. Both produce identical output and pass the same 16 baseline tests.

**Task:** Add a commission report with tiered rates, regional multipliers, and quarterly totals.

```bash
cd code-style/
./run-experiment.sh commission all 5 sonnet 30
```

