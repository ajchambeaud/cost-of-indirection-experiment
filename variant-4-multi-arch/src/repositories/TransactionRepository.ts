import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { TransactionRow } from "../types";

export class TransactionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(accountId: string, type: string, amount: number, relatedAccountId: string | null = null): string {
    const id = uuidv4();
    this.db
      .prepare(
        "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(id, accountId, type, amount, relatedAccountId);
    return id;
  }

  findByAccountId(accountId: string, type?: string): TransactionRow[] {
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
