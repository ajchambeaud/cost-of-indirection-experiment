import { createDatabase } from "../adapters/out/persistence/database";
import { SqliteAccountRepository } from "../adapters/out/persistence/SqliteAccountRepository";
import { SqliteTransactionRepository } from "../adapters/out/persistence/SqliteTransactionRepository";
import { SqliteDailyTransferRepository } from "../adapters/out/persistence/SqliteDailyTransferRepository";
import { SqliteUnitOfWork } from "../adapters/out/persistence/SqliteUnitOfWork";
import { AccountDomainService } from "../domain/services/AccountDomainService";
import { TransferDomainService } from "../domain/services/TransferDomainService";
import { TransactionQueryDomainService } from "../domain/services/TransactionQueryDomainService";
import { AccountUseCase } from "../domain/ports/in/AccountUseCase";
import { TransferUseCase } from "../domain/ports/in/TransferUseCase";
import { TransactionQueryUseCase } from "../domain/ports/in/TransactionQueryUseCase";

export interface Container {
  accountUseCase: AccountUseCase;
  transferUseCase: TransferUseCase;
  transactionQueryUseCase: TransactionQueryUseCase;
}

export function createContainer(): Container {
  const db = createDatabase();

  // Driven adapters (output port implementations)
  const accountRepository = new SqliteAccountRepository(db);
  const transactionRepository = new SqliteTransactionRepository(db);
  const dailyTransferRepository = new SqliteDailyTransferRepository(db);
  const unitOfWork = new SqliteUnitOfWork(db);

  // Domain services (input port implementations)
  const accountUseCase: AccountUseCase = new AccountDomainService(
    accountRepository,
    transactionRepository
  );

  const transferUseCase: TransferUseCase = new TransferDomainService(
    accountRepository,
    transactionRepository,
    dailyTransferRepository,
    unitOfWork
  );

  const transactionQueryUseCase: TransactionQueryUseCase = new TransactionQueryDomainService(
    accountRepository,
    transactionRepository
  );

  return {
    accountUseCase,
    transferUseCase,
    transactionQueryUseCase,
  };
}
