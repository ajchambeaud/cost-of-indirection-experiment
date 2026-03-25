import { createDatabase } from "./database";
import { AccountRepository } from "./repositories/AccountRepository";
import { TransactionRepository } from "./repositories/TransactionRepository";
import { DailyTransferRepository } from "./repositories/DailyTransferRepository";
import { AccountService } from "./services/AccountService";
import { TransferService } from "./services/TransferService";
import { TransactionQueryService } from "./services/TransactionQueryService";

export function createContainer() {
  const db = createDatabase();

  // Repositories
  const accountRepository = new AccountRepository(db);
  const transactionRepository = new TransactionRepository(db);
  const dailyTransferRepository = new DailyTransferRepository(db);

  // Services
  const accountService = new AccountService(accountRepository, transactionRepository);
  const transferService = new TransferService(
    db,
    accountRepository,
    transactionRepository,
    dailyTransferRepository
  );
  const transactionQueryService = new TransactionQueryService(
    accountRepository,
    transactionRepository
  );

  return {
    accountService,
    transferService,
    transactionQueryService,
  };
}
