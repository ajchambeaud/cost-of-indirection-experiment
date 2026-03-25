import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { AccountRow } from "../types";

export class AccountRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(name: string, email: string): AccountRow {
    const id = uuidv4();
    this.db
      .prepare("INSERT INTO accounts (id, name, email, balance) VALUES (?, ?, ?, 0)")
      .run(id, name, email);
    return this.findById(id)!;
  }

  findById(id: string): AccountRow | undefined {
    return this.db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
  }

  findByEmail(email: string): AccountRow | undefined {
    return this.db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
  }

  updateBalance(id: string, newBalance: number): void {
    this.db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newBalance, id);
  }

  incrementBalance(id: string, amount: number): void {
    this.db
      .prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?")
      .run(amount, id);
  }

  decrementBalance(id: string, amount: number): void {
    this.db
      .prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?")
      .run(amount, id);
  }
}
