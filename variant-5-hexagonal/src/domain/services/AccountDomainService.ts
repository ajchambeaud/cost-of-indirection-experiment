import { Account } from "../models/Account";
import {
  AccountNotFoundError,
  DuplicateEmailError,
  InsufficientFundsError,
} from "../models/DomainError";
import { AccountUseCase } from "../ports/in/AccountUseCase";
import { AccountRepository } from "../ports/out/AccountRepository";
import { TransactionRepository } from "../ports/out/TransactionRepository";

export class AccountDomainService implements AccountUseCase {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly transactionRepo: TransactionRepository
  ) {}

  createAccount(name: string, email: string): Account {
    const existing = this.accountRepo.findByEmail(email);
    if (existing) {
      throw new DuplicateEmailError();
    }
    return this.accountRepo.create(name, email);
  }

  getAccount(id: string): Account {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new AccountNotFoundError();
    }
    return account;
  }

  deposit(id: string, amount: number): Account {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new AccountNotFoundError();
    }

    const newBalance = account.balance + amount;
    this.accountRepo.updateBalance(id, newBalance);
    this.transactionRepo.create(id, "deposit", amount);

    return new Account({ ...account.toJSON(), balance: newBalance });
  }

  withdraw(id: string, amount: number): Account {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new AccountNotFoundError();
    }

    if (!account.canWithdraw(amount)) {
      throw new InsufficientFundsError();
    }

    const newBalance = account.balance - amount;
    this.accountRepo.updateBalance(id, newBalance);
    this.transactionRepo.create(id, "withdrawal", amount);

    return new Account({ ...account.toJSON(), balance: newBalance });
  }
}
