export interface UnitOfWork {
  runInTransaction<T>(fn: () => T): T;
}
