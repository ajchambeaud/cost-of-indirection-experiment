import Database from "better-sqlite3";
import { UnitOfWork } from "../../../domain/ports/out/UnitOfWork";

export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}
