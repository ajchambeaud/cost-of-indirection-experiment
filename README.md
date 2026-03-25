# Complexity Test: Do Clean Code Abstractions Help Coding Agents?

## Hypothesis

Software engineering best practices (abstractions, clean code, architecture patterns) evolved for **human cognition**. This experiment tests whether those same practices help, hurt, or are neutral when the code is being written and modified by **LLM-based coding agents** (Claude Code).

## Experiment Design

### Independent Variable: Code Organization

We implement the **same Wallet/Money Transfer API** in 5 variants with increasing abstraction:

| # | Variant | Directory | Description |
|---|---|---|---|
| 1 | Single file, flat | `variant-1-flat/` | Everything in one `app.js` — routes, SQL, validation, all inline |
| 2 | Single file, structured | `variant-2-structured/` | One `app.js` with classes (DB, AccountService, TransferService, TransactionService, Validators) |
| 3 | Multi-file, light | `variant-3-multi-light/` | Split by concern: `app.js`, `routes.js`, `services.js`, `validators.js`, `db.js` |
| 4 | Multi-file, full architecture | `variant-4-multi-arch/` | Repository pattern, service layer, DTOs, middleware, error classes, DI container (15 files) |
| 5 | Hexagonal (ports & adapters) | `variant-5-hexagonal/` | Domain core with ports (interfaces), adapters (HTTP, persistence), application services, strict dependency inversion |

All 5 variants expose the **exact same API** and pass the **same e2e test suite** (30 tests).

### API Contract

All variants implement:

| Endpoint | Method | Description |
|---|---|---|
| `POST /accounts` | Create | Create account (name, email). Returns 201. Rejects duplicate email (409). |
| `GET /accounts/:id` | Read | Get account with balance. Returns 404 if not found. |
| `POST /accounts/:id/deposit` | Action | Deposit money. Min $1. Returns updated balance. |
| `POST /accounts/:id/withdraw` | Action | Withdraw money. Min $1. Overdraft protection (400). |
| `POST /transfers` | Action | Transfer between accounts. Atomic. Daily $10k limit. Self-transfer rejected. |
| `GET /accounts/:id/transactions` | Read | Transaction history. Filterable by `?type=deposit\|withdrawal\|transfer`. Reverse chronological. |

### Business Rules
- Minimum deposit/transfer/withdrawal: $1
- Overdraft protection (cannot withdraw/transfer more than balance)
- Transfers are atomic (both sides succeed or neither does)
- Daily transfer limit per account: $10,000
- No duplicate emails
- Transactions recorded for both sides of a transfer

### Tech Stack
- Node.js + Express + better-sqlite3 (in-memory) + uuid
- No external dependencies beyond these
- Node built-in test runner (`node --test`) for e2e tests

## Dependent Variables (Metrics)

### What We Measure

We use `claude -p "<task>" --output-format json` which returns:

```json
{
  "num_turns": 3,                          // iterations/agent loop turns
  "duration_ms": 9672,                     // wall clock time
  "duration_api_ms": 9632,                 // API time (excludes tool execution)
  "total_cost_usd": 0.067,                // total cost
  "is_error": false,                       // success/failure
  "usage": {
    "input_tokens": 5,                     // input tokens (excludes cached)
    "output_tokens": 260,                  // output tokens
    "cache_creation_input_tokens": 6603,   // new context cached
    "cache_read_input_tokens": 39007       // context loaded from cache
  }
}
```

**Key metrics:**
- **Total tokens**: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens`
- **Turns**: `num_turns` — number of agent loop iterations
- **Cost**: `total_cost_usd` — single summary metric
- **Duration**: `duration_ms` — wall clock time
- **Success rate**: `is_error` + e2e test pass/fail after the agent runs

**Supplementary metrics (from git after each run):**
- `git diff --stat` — files changed, lines added/removed
- `git diff --name-only | wc -l` — edit dispersion (number of files touched)

**Not available from Claude Code JSON output:**
- Per-turn token breakdown (`iterations` array is always empty)
- Individual tool calls (which files were read, how many greps, etc.)

### How We Run

```bash
# Test a variant manually
cd architecture/
./run-tests.sh variant-1-flat [port]

# The runner:
# 1. Installs deps if needed
# 2. Starts the server on the given port
# 3. Runs all e2e tests against it
# 4. Kills the server
# 5. Exits with the test exit code
```

## Tasks for the Agent

After establishing the baseline (working API with all 30 tests passing), we give the agent feature tasks and measure the cost:

| Task | Why It's Interesting |
|---|---|
| **Add multi-currency support** with conversion rates | Cross-cutting — touches accounts, transfers, history. Every layer needs changes. |
| **Add recurring/scheduled transfers** | New entity + business logic + scheduling concept |
| **Add transaction categories** + spending report endpoint | Read-path feature, aggregation logic |
| **Add webhook notifications** on transfers above a threshold | Side-effect feature, new integration point |

### Running a Task Against a Variant

```bash
cd architecture/

# 1. Reset to baseline
cd variant-X && git checkout .

# 2. Run the agent
claude -p "<task prompt>" \
  --output-format json \
  --allowedTools "Read Edit Write Glob Grep Bash" \
  --max-turns 30 \
  --dangerously-skip-permissions \
  2>/dev/null > result.json

# 3. Check correctness
./run-tests.sh variant-X <port>

# 4. Capture edit dispersion
git diff --stat
git diff --name-only | wc -l

# 5. Log result.json metrics
```

### Statistical Validity
- Run each task **3-5 times** per variant (LLM output is non-deterministic)
- Report **medians** (not means — outliers are common)
- Total: 5 variants × 4 tasks × 5 runs = 100 runs

## Project Structure

```
complexity_test/
├── README.md                    ← this file
├── architecture/                ← experiment 1: architecture complexity
│   ├── package.json             ← test runner deps
│   ├── run-tests.sh             ← test runner script
│   ├── run-experiment.sh        ← full experiment automation
│   ├── e2e/                     ← shared e2e test suite
│   │   ├── helpers.js           ← HTTP client helpers
│   │   ├── baseline/            ← baseline tests (30 tests, must always pass)
│   │   └── tasks/multi-currency/← feature task tests (11 tests)
│   ├── tasks/                   ← agent task prompts
│   │   └── multi-currency.prompt.md
│   ├── results/                 ← experiment results (gitignored)
│   ├── variant-1-flat/          ← single file, everything inline (TypeScript)
│   ├── variant-2-structured/    ← single file, classes and functions (TypeScript)
│   ├── variant-3-multi-light/   ← multi-file, split by concern (TypeScript)
│   ├── variant-4-multi-arch/    ← full architecture (repos, services, DTOs, DI) (TypeScript)
│   └── variant-5-hexagonal/     ← ports & adapters with TS interfaces (TypeScript)
└── code-style/                  ← experiment 2: code style (inline vs abstracted)
    ├── run-tests.sh
    ├── run-experiment.sh
    ├── fixtures/
    ├── tests/
    ├── tasks/
    ├── variant-a-inline/
    └── variant-b-abstracted/
```

## Current Status

- [x] E2e test suite (30 baseline + 11 task tests)
- [x] All 5 variants in TypeScript (all baseline tests passing)
- [x] Experiment runner script
- [x] Multi-currency task prompt + tests
- [x] First experiment run (3 runs × 5 variants, Sonnet 4.6)
- [ ] Second experiment run (5 runs × 5 variants, Sonnet 4.6)
- [ ] Additional tasks (recurring transfers, categories, webhooks)

## Results: Multi-Currency Task (Sonnet 4.6, 3 runs)

Full report: `results/multi-currency/20260314-211052/REPORT.md`

### Summary (median values)

| Variant | Cost | Turns | Time | Files Changed | Task Pass Rate |
|---|---|---|---|---|---|
| 1. Flat | $0.22 | 10 | 78s | 1 | **3/3 (100%)** |
| 2. Structured | $0.22 | 12 | 81s | 1 | **3/3 (100%)** |
| 3. Multi-light | $0.26 | 16 | 100s | 5 | **3/3 (100%)** |
| 4. Full arch | $0.43 | 22 | 149s | 9 | **3/3 (100%)** |
| 5. Hexagonal | $0.73 | 31 | 225s | 12 | **1/3 (33%)** |

### Key Findings

1. **More abstraction = more cost, no correctness benefit.** Hexagonal costs 3.4x more than flat with worse reliability.
2. **The agent's main cost is reading, not writing.** Hexagonal loads 5.3x more context tokens navigating files.
3. **Single-file variants are essentially equivalent** ($0.22 both). Structure within one file is free.
4. **The big cost jump is at variant 4** (full architecture). Repositories + DI doubles the cost.
5. **Hexagonal hurts reliability.** 2/3 runs failed — too many layers to coordinate consistently.
6. **Edit dispersion correlates with failure.** 12+ files changed → 33% success. 1-9 files → 100% success.
