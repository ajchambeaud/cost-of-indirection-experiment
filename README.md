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
├── package.json                 ← root package (test runner deps)
├── run-tests.sh                 ← test runner script
├── e2e/                         ← shared e2e test suite (30 tests)
│   ├── helpers.js               ← HTTP client helpers
│   ├── accounts.test.js         ← account CRUD + deposit/withdraw tests
│   ├── transfers.test.js        ← transfer tests (atomicity, limits, concurrency)
│   └── transactions.test.js     ← transaction history tests (filtering, ordering)
├── variant-1-flat/              ← single file, everything inline
├── variant-2-structured/        ← single file, classes and functions
├── variant-3-multi-light/       ← multi-file, split by concern
├── variant-4-multi-arch/        ← full architecture (repos, services, DTOs, DI)
└── variant-5-hexagonal/         ← ports & adapters (TODO)
```

## Current Status

- [x] E2e test suite (30 tests)
- [x] Variant 1 — flat (all tests passing)
- [x] Variant 2 — structured (all tests passing)
- [x] Variant 3 — multi-file light (all tests passing)
- [x] Variant 4 — multi-file full architecture (all tests passing)
- [ ] Variant 5 — hexagonal (ports & adapters)
- [ ] Experiment runner script (automates runs + collects metrics)
- [ ] Task prompts (standardized prompts for each feature task)
- [ ] Results analysis

## Expected Outcomes (Hypotheses)

- **Variant 1 (flat)** wins on token cost and speed for small tasks — one file to read, one file to edit
- **Variant 5 (hexagonal)** costs the most tokens — many files to navigate, lots of indirection
- **Heavy architecture hurts more than helps** — the agent spends tokens navigating indirection that exists for human long-term maintainability, not for a reader understanding the code right now
- **Multi-file may win on correctness** for cross-cutting changes — file names act as semantic cues
- The sweet spot is likely **variant 2 or 3** — enough structure for comprehension, not so much that navigation dominates
