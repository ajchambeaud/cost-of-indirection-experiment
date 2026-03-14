import express, { Request, Response, Express } from "express";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountRow {
  id: string;
  name: string;
  email: string;
  balance: number;
  created_at: string;
}

interface TransactionRow {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  related_account_id: string | null;
  created_at: string;
}

interface DailyTransferRow {
  total: number;
}

interface ServiceResult<T = AccountRow> {
  data?: T;
  error?: string;
  status: number;
}

// ─── Database ────────────────────────────────────────────────────────────────

class DB {
  private db: Database.Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this._migrate();
  }

  private _migrate(): void {
    this.db.exec(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id),
        type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
        amount REAL NOT NULL,
        related_account_id TEXT REFERENCES accounts(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE daily_transfers (
        account_id TEXT NOT NULL REFERENCES accounts(id),
        date TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (account_id, date)
      );
    `);
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }
}

// ─── Account Service ─────────────────────────────────────────────────────────

class AccountService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  create(name: string, email: string): ServiceResult {
    const existing = this.db.prepare("SELECT id FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
    if (existing) {
      return { error: "Email already exists", status: 409 };
    }

    const id = uuidv4();
    this.db.prepare("INSERT INTO accounts (id, name, email, balance) VALUES (?, ?, ?, 0)").run(id, name, email);
    return { data: this.findById(id)!, status: 201 };
  }

  findById(id: string): AccountRow | undefined {
    return this.db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
  }

  updateBalance(id: string, newBalance: number): void {
    this.db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, id);
  }

  deposit(id: string, amount: number): ServiceResult {
    const account = this.findById(id);
    if (!account) {
      return { error: "Account not found", status: 404 };
    }

    const newBalance = account.balance + amount;
    this.updateBalance(id, newBalance);

    const txId = uuidv4();
    this.db
      .prepare("INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'deposit', ?)")
      .run(txId, id, amount);

    return { data: { ...account, balance: newBalance }, status: 200 };
  }

  withdraw(id: string, amount: number): ServiceResult {
    const account = this.findById(id);
    if (!account) {
      return { error: "Account not found", status: 404 };
    }

    if (account.balance < amount) {
      return { error: "Insufficient funds", status: 400 };
    }

    const newBalance = account.balance - amount;
    this.updateBalance(id, newBalance);

    const txId = uuidv4();
    this.db
      .prepare("INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'withdrawal', ?)")
      .run(txId, id, amount);

    return { data: { ...account, balance: newBalance }, status: 200 };
  }
}

// ─── Transfer Service ────────────────────────────────────────────────────────

interface TransferResult {
  fromAccount: AccountRow;
  toAccount: AccountRow;
  amount: number;
}

class TransferService {
  private db: DB;
  private accountService: AccountService;

  constructor(db: DB, accountService: AccountService) {
    this.db = db;
    this.accountService = accountService;
  }

  private getDailyTotal(accountId: string, date: string): number {
    const row = this.db
      .prepare("SELECT total FROM daily_transfers WHERE account_id = ? AND date = ?")
      .get(accountId, date) as DailyTransferRow | undefined;
    return row ? row.total : 0;
  }

  private recordDailyTransfer(accountId: string, date: string, amount: number): void {
    this.db
      .prepare(
        `INSERT INTO daily_transfers (account_id, date, total) VALUES (?, ?, ?)
         ON CONFLICT(account_id, date) DO UPDATE SET total = total + ?`
      )
      .run(accountId, date, amount, amount);
  }

  private recordTransaction(accountId: string, amount: number, relatedAccountId: string): void {
    const txId = uuidv4();
    this.db
      .prepare(
        "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, 'transfer', ?, ?)"
      )
      .run(txId, accountId, amount, relatedAccountId);
  }

  execute(fromId: string, toId: string, amount: number): ServiceResult<TransferResult> {
    const from = this.accountService.findById(fromId);
    if (!from) {
      return { error: "Source account not found", status: 404 };
    }

    const to = this.accountService.findById(toId);
    if (!to) {
      return { error: "Destination account not found", status: 404 };
    }

    if (from.balance < amount) {
      return { error: "Insufficient funds", status: 400 };
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyTotal = this.getDailyTotal(fromId, today);
    if (dailyTotal + amount > 10000) {
      return { error: "Daily transfer limit of $10,000 exceeded", status: 400 };
    }

    const doTransfer = this.db.transaction(() => {
      this.db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, fromId);
      this.db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, toId);
      this.recordTransaction(fromId, amount, toId);
      this.recordTransaction(toId, amount, fromId);
      this.recordDailyTransfer(fromId, today, amount);
    });

    doTransfer();

    return {
      data: {
        fromAccount: this.accountService.findById(fromId)!,
        toAccount: this.accountService.findById(toId)!,
        amount,
      },
      status: 201,
    };
  }
}

// ─── Transaction Service ─────────────────────────────────────────────────────

class TransactionService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  getByAccountId(accountId: string, type?: string): TransactionRow[] {
    let query = "SELECT * FROM transactions WHERE account_id = ?";
    const params: string[] = [accountId];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY created_at DESC";
    return this.db.prepare(query).all(...params) as TransactionRow[];
  }
}

// ─── Validators ──────────────────────────────────────────────────────────────

class Validators {
  static requireFields(body: Record<string, unknown>, ...fields: string[]): string | null {
    for (const field of fields) {
      if (!body || !body[field]) {
        return `${field} is required`;
      }
    }
    return null;
  }

  static validateAmount(amount: unknown): string | null {
    if (!amount || (typeof amount === "number" && amount < 1)) {
      return "Amount must be at least $1";
    }
    return null;
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function createApp(
  accountService: AccountService,
  transferService: TransferService,
  transactionService: TransactionService
): Express {
  const app = express();
  app.use(express.json());

  app.post("/accounts", (req: Request, res: Response): void => {
    const err = Validators.requireFields(req.body, "name", "email");
    if (err) { res.status(400).json({ error: err }); return; }

    const { name, email } = req.body;
    const result = accountService.create(name, email);
    res.status(result.status).json(result.data || { error: result.error });
  });

  app.get("/accounts/:id", (req: Request, res: Response): void => {
    const account = accountService.findById(req.params.id);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    res.json(account);
  });

  app.post("/accounts/:id/deposit", (req: Request, res: Response): void => {
    const err = Validators.validateAmount(req.body && req.body.amount);
    if (err) { res.status(400).json({ error: err }); return; }

    const result = accountService.deposit(req.params.id, req.body.amount);
    res.status(result.status).json(result.data || { error: result.error });
  });

  app.post("/accounts/:id/withdraw", (req: Request, res: Response): void => {
    const err = Validators.validateAmount(req.body && req.body.amount);
    if (err) { res.status(400).json({ error: err }); return; }

    const result = accountService.withdraw(req.params.id, req.body.amount);
    res.status(result.status).json(result.data || { error: result.error });
  });

  app.post("/transfers", (req: Request, res: Response): void => {
    const { fromAccountId, toAccountId, amount } = req.body || {};

    const err = Validators.validateAmount(amount);
    if (err) { res.status(400).json({ error: err }); return; }

    if (fromAccountId === toAccountId) {
      res.status(400).json({ error: "Cannot transfer to same account" });
      return;
    }

    const result = transferService.execute(fromAccountId, toAccountId, amount);
    res.status(result.status).json(result.data || { error: result.error });
  });

  app.get("/accounts/:id/transactions", (req: Request, res: Response): void => {
    const account = accountService.findById(req.params.id);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }

    const transactions = transactionService.getByAccountId(
      req.params.id,
      req.query.type as string | undefined
    );
    res.json(transactions);
  });

  return app;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const db = new DB();
const accountService = new AccountService(db);
const transferService = new TransferService(db, accountService);
const transactionService = new TransactionService(db);

const app = createApp(accountService, transferService, transactionService);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Variant 2 (structured) running on port ${PORT}`);
});
