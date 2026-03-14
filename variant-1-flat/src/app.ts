import express, { Request, Response } from "express";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

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

const app = express();
app.use(express.json());

const db = new Database(":memory:");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

// Create account
app.post("/accounts", (req: Request, res: Response): void => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }

  const existing = db.prepare("SELECT id FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const id = uuidv4();
  db.prepare("INSERT INTO accounts (id, name, email, balance) VALUES (?, ?, ?, 0)").run(id, name, email);

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow;
  res.status(201).json(account);
});

// Get account
app.get("/accounts/:id", (req: Request, res: Response): void => {
  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id) as AccountRow | undefined;
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(account);
});

// Deposit
app.post("/accounts/:id/deposit", (req: Request, res: Response): void => {
  const { amount } = req.body || {};

  if (!amount || amount < 1) {
    res.status(400).json({ error: "Amount must be at least $1" });
    return;
  }

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id) as AccountRow | undefined;
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const newBalance = account.balance + amount;
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, req.params.id);

  const txId = uuidv4();
  db.prepare(
    "INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'deposit', ?)"
  ).run(txId, req.params.id, amount);

  res.json({ ...account, balance: newBalance });
});

// Withdraw
app.post("/accounts/:id/withdraw", (req: Request, res: Response): void => {
  const { amount } = req.body || {};

  if (!amount || amount < 1) {
    res.status(400).json({ error: "Amount must be at least $1" });
    return;
  }

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id) as AccountRow | undefined;
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (account.balance < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const newBalance = account.balance - amount;
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, req.params.id);

  const txId = uuidv4();
  db.prepare(
    "INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'withdrawal', ?)"
  ).run(txId, req.params.id, amount);

  res.json({ ...account, balance: newBalance });
});

// Transfer
app.post("/transfers", (req: Request, res: Response): void => {
  const { fromAccountId, toAccountId, amount } = req.body || {};

  if (!amount || amount < 1) {
    res.status(400).json({ error: "Amount must be at least $1" });
    return;
  }

  if (fromAccountId === toAccountId) {
    res.status(400).json({ error: "Cannot transfer to same account" });
    return;
  }

  const from = db.prepare("SELECT * FROM accounts WHERE id = ?").get(fromAccountId) as AccountRow | undefined;
  if (!from) {
    res.status(404).json({ error: "Source account not found" });
    return;
  }

  const to = db.prepare("SELECT * FROM accounts WHERE id = ?").get(toAccountId) as AccountRow | undefined;
  if (!to) {
    res.status(404).json({ error: "Destination account not found" });
    return;
  }

  if (from.balance < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const dailyRow = db
    .prepare("SELECT total FROM daily_transfers WHERE account_id = ? AND date = ?")
    .get(fromAccountId, today) as DailyTransferRow | undefined;
  const dailyTotal = dailyRow ? dailyRow.total : 0;

  if (dailyTotal + amount > 10000) {
    res.status(400).json({ error: "Daily transfer limit of $10,000 exceeded" });
    return;
  }

  // Execute transfer in a transaction
  const doTransfer = db.transaction(() => {
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, fromAccountId);
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, toAccountId);

    const txId1 = uuidv4();
    const txId2 = uuidv4();
    db.prepare(
      "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, 'transfer', ?, ?)"
    ).run(txId1, fromAccountId, amount, toAccountId);
    db.prepare(
      "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, 'transfer', ?, ?)"
    ).run(txId2, toAccountId, amount, fromAccountId);

    // Update daily limit tracking
    db.prepare(
      `INSERT INTO daily_transfers (account_id, date, total) VALUES (?, ?, ?)
       ON CONFLICT(account_id, date) DO UPDATE SET total = total + ?`
    ).run(fromAccountId, today, amount, amount);
  });

  doTransfer();

  const updatedFrom = db.prepare("SELECT * FROM accounts WHERE id = ?").get(fromAccountId) as AccountRow;
  const updatedTo = db.prepare("SELECT * FROM accounts WHERE id = ?").get(toAccountId) as AccountRow;

  res.status(201).json({
    fromAccount: updatedFrom,
    toAccount: updatedTo,
    amount,
  });
});

// Transaction history
app.get("/accounts/:id/transactions", (req: Request, res: Response): void => {
  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id) as AccountRow | undefined;
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  let query = "SELECT * FROM transactions WHERE account_id = ?";
  const params: string[] = [req.params.id];

  const typeFilter = req.query.type as string | undefined;
  if (typeFilter) {
    query += " AND type = ?";
    params.push(typeFilter);
  }

  query += " ORDER BY created_at DESC";

  const transactions = db.prepare(query).all(...params) as TransactionRow[];
  res.json(transactions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Variant 1 (flat) running on port ${PORT}`);
});
