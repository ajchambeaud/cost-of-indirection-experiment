import { v4 as uuidv4 } from "uuid";
import db from "./db";
import {
  AccountRow,
  TransactionRow,
  DailyTransferRow,
  ServiceResult,
  TransferResult,
} from "./types";

// ─── Accounts ────────────────────────────────────────────────────────────────

export function createAccount(name: string, email: string): ServiceResult {
  const existing = db.prepare("SELECT id FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
  if (existing) {
    return { error: "Email already exists", status: 409 };
  }

  const id = uuidv4();
  db.prepare("INSERT INTO accounts (id, name, email, balance) VALUES (?, ?, ?, 0)").run(id, name, email);
  return { data: findAccountById(id)!, status: 201 };
}

export function findAccountById(id: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
}

export function deposit(id: string, amount: number): ServiceResult {
  const account = findAccountById(id);
  if (!account) return { error: "Account not found", status: 404 };

  const newBalance = account.balance + amount;
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, id);

  const txId = uuidv4();
  db.prepare("INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'deposit', ?)").run(txId, id, amount);

  return { data: { ...account, balance: newBalance }, status: 200 };
}

export function withdraw(id: string, amount: number): ServiceResult {
  const account = findAccountById(id);
  if (!account) return { error: "Account not found", status: 404 };

  if (account.balance < amount) {
    return { error: "Insufficient funds", status: 400 };
  }

  const newBalance = account.balance - amount;
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, id);

  const txId = uuidv4();
  db.prepare("INSERT INTO transactions (id, account_id, type, amount) VALUES (?, ?, 'withdrawal', ?)").run(txId, id, amount);

  return { data: { ...account, balance: newBalance }, status: 200 };
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export function transfer(fromId: string, toId: string, amount: number): ServiceResult<TransferResult> {
  const from = findAccountById(fromId);
  if (!from) return { error: "Source account not found", status: 404 };

  const to = findAccountById(toId);
  if (!to) return { error: "Destination account not found", status: 404 };

  if (from.balance < amount) {
    return { error: "Insufficient funds", status: 400 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const dailyRow = db
    .prepare("SELECT total FROM daily_transfers WHERE account_id = ? AND date = ?")
    .get(fromId, today) as DailyTransferRow | undefined;
  const dailyTotal = dailyRow ? dailyRow.total : 0;

  if (dailyTotal + amount > 10000) {
    return { error: "Daily transfer limit of $10,000 exceeded", status: 400 };
  }

  const doTransfer = db.transaction(() => {
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, fromId);
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, toId);

    const txId1 = uuidv4();
    const txId2 = uuidv4();
    db.prepare(
      "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, 'transfer', ?, ?)"
    ).run(txId1, fromId, amount, toId);
    db.prepare(
      "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, 'transfer', ?, ?)"
    ).run(txId2, toId, amount, fromId);

    db.prepare(
      `INSERT INTO daily_transfers (account_id, date, total) VALUES (?, ?, ?)
       ON CONFLICT(account_id, date) DO UPDATE SET total = total + ?`
    ).run(fromId, today, amount, amount);
  });

  doTransfer();

  return {
    data: {
      fromAccount: findAccountById(fromId)!,
      toAccount: findAccountById(toId)!,
      amount,
    },
    status: 201,
  };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export function getTransactions(accountId: string, type?: string): TransactionRow[] {
  let query = "SELECT * FROM transactions WHERE account_id = ?";
  const params: string[] = [accountId];

  if (type) {
    query += " AND type = ?";
    params.push(type);
  }

  query += " ORDER BY created_at DESC";
  return db.prepare(query).all(...params) as TransactionRow[];
}
