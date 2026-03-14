import { Transaction } from "../models/Transaction";
import { AccountNotFoundError } from "../models/DomainError";
import { TransactionQueryUseCase } from "../ports/in/TransactionQueryUseCase";
import { AccountRepository } from "../ports/out/AccountRepository";
import { TransactionRepository } from "../ports/out/TransactionRepository";

export class TransactionQueryDomainService implements TransactionQueryUseCase {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly transactionRepo: TransactionRepository
  ) {}

  getTransactions(accountId: string, type?: string): Transaction[] {
    const account = this.accountRepo.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }
    return this.transactionRepo.findByAccountId(accountId, type);
  }
}
