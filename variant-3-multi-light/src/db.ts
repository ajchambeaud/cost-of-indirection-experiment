import Database from "better-sqlite3";

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

export default db;
