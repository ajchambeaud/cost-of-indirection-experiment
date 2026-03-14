import Database from "better-sqlite3";
import { DailyTransferRow } from "../types";

export class DailyTransferRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  getDailyTotal(accountId: string, date: string): number {
    const row = this.db
      .prepare("SELECT total FROM daily_transfers WHERE account_id = ? AND date = ?")
      .get(accountId, date) as DailyTransferRow | undefined;
    return row ? row.total : 0;
  }

  addToDaily(accountId: string, date: string, amount: number): void {
    this.db
      .prepare(
        `INSERT INTO daily_transfers (account_id, date, total) VALUES (?, ?, ?)
         ON CONFLICT(account_id, date) DO UPDATE SET total = total + ?`
      )
      .run(accountId, date, amount, amount);
  }
}
