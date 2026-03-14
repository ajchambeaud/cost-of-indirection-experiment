import { NotFoundError } from "../errors/AppError";
import { AccountRepository } from "../repositories/AccountRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { TransactionRow } from "../types";

export class TransactionQueryService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor(accountRepository: AccountRepository, transactionRepository: TransactionRepository) {
    this.accountRepo = accountRepository;
    this.transactionRepo = transactionRepository;
  }

  getByAccountId(accountId: string, type?: string): TransactionRow[] {
    const account = this.accountRepo.findById(accountId);
    if (!account) {
      throw new NotFoundError("Account");
    }
    return this.transactionRepo.findByAccountId(accountId, type);
  }
}
