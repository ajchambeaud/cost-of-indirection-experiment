import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { Account } from "../../../domain/models/Account";
import { AccountRepository } from "../../../domain/ports/out/AccountRepository";

interface AccountRow {
  id: string;
  name: string;
  email: string;
  balance: number;
  created_at: string;
}

export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: Database.Database) {}

  create(name: string, email: string): Account {
    const id = uuidv4();
    this.db
      .prepare("INSERT INTO accounts (id, name, email, balance) VALUES (?, ?, ?, 0)")
      .run(id, name, email);
    return this.findById(id)!;
  }

  findById(id: string): Account | undefined {
    const row = this.db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
    return row ? new Account(row) : undefined;
  }

  findByEmail(email: string): Account | undefined {
    const row = this.db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
    return row ? new Account(row) : undefined;
  }

  updateBalance(id: string, newBalance: number): void {
    this.db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, id);
  }

  incrementBalance(id: string, amount: number): void {
    this.db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, id);
  }

  decrementBalance(id: string, amount: number): void {
    this.db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, id);
  }
}
