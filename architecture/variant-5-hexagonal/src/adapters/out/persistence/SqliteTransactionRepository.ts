import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../../../domain/models/Transaction";
import { TransactionRepository } from "../../../domain/ports/out/TransactionRepository";

interface TransactionRow {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  related_account_id: string | null;
  created_at: string;
}

export class SqliteTransactionRepository implements TransactionRepository {
  constructor(private readonly db: Database.Database) {}

  create(accountId: string, type: string, amount: number, relatedAccountId: string | null = null): string {
    const id = uuidv4();
    this.db
      .prepare(
        "INSERT INTO transactions (id, account_id, type, amount, related_account_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(id, accountId, type, amount, relatedAccountId);
    return id;
  }

  findByAccountId(accountId: string, type?: string): Transaction[] {
    let query = "SELECT * FROM transactions WHERE account_id = ?";
    const params: string[] = [accountId];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY created_at DESC";
    const rows = this.db.prepare(query).all(...params) as TransactionRow[];
    return rows.map((row) => new Transaction(row));
  }
}
