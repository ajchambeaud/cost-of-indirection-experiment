import {
  AccountNotFoundError,
  InsufficientFundsError,
  DailyLimitExceededError,
} from "../models/DomainError";
import { TransferUseCase, TransferResult } from "../ports/in/TransferUseCase";
import { AccountRepository } from "../ports/out/AccountRepository";
import { TransactionRepository } from "../ports/out/TransactionRepository";
import { DailyTransferRepository } from "../ports/out/DailyTransferRepository";
import { UnitOfWork } from "../ports/out/UnitOfWork";

const DAILY_TRANSFER_LIMIT = 10000;

export class TransferDomainService implements TransferUseCase {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly dailyTransferRepo: DailyTransferRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  executeTransfer(fromId: string, toId: string, amount: number): TransferResult {
    const from = this.accountRepo.findById(fromId);
    if (!from) {
      throw new AccountNotFoundError("Source account");
    }

    const to = this.accountRepo.findById(toId);
    if (!to) {
      throw new AccountNotFoundError("Destination account");
    }

    if (!from.canWithdraw(amount)) {
      throw new InsufficientFundsError();
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyTotal = this.dailyTransferRepo.getDailyTotal(fromId, today);
    if (dailyTotal + amount > DAILY_TRANSFER_LIMIT) {
      throw new DailyLimitExceededError();
    }

    this.unitOfWork.runInTransaction(() => {
      this.accountRepo.decrementBalance(fromId, amount);
      this.accountRepo.incrementBalance(toId, amount);

      this.transactionRepo.create(fromId, "transfer", amount, toId);
      this.transactionRepo.create(toId, "transfer", amount, fromId);

      this.dailyTransferRepo.addToDaily(fromId, today, amount);
    });

    return {
      fromAccount: this.accountRepo.findById(fromId)!,
      toAccount: this.accountRepo.findById(toId)!,
      amount,
    };
  }
}
