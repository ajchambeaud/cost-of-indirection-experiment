import { AccountRow } from "../types";
import { NotFoundError, ConflictError, ValidationError } from "../errors/AppError";
import { AccountRepository } from "../repositories/AccountRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

export class AccountService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor(accountRepository: AccountRepository, transactionRepository: TransactionRepository) {
    this.accountRepo = accountRepository;
    this.transactionRepo = transactionRepository;
  }

  create(name: string, email: string): AccountRow {
    const existing = this.accountRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email already exists");
    }
    return this.accountRepo.create(name, email);
  }

  getById(id: string): AccountRow {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError("Account");
    }
    return account;
  }

  deposit(id: string, amount: number): AccountRow {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError("Account");
    }

    const newBalance = account.balance + amount;
    this.accountRepo.updateBalance(id, newBalance);
    this.transactionRepo.create(id, "deposit", amount);

    return { ...account, balance: newBalance };
  }

  withdraw(id: string, amount: number): AccountRow {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError("Account");
    }

    if (account.balance < amount) {
      throw new ValidationError("Insufficient funds");
    }

    const newBalance = account.balance - amount;
    this.accountRepo.updateBalance(id, newBalance);
    this.transactionRepo.create(id, "withdrawal", amount);

    return { ...account, balance: newBalance };
  }
}
