import Database from "better-sqlite3";
import { NotFoundError, ValidationError } from "../errors/AppError";
import { AccountRepository } from "../repositories/AccountRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { DailyTransferRepository } from "../repositories/DailyTransferRepository";
import { AccountRow } from "../types";

const DAILY_TRANSFER_LIMIT = 10000;

interface TransferResult {
  fromAccount: AccountRow;
  toAccount: AccountRow;
  amount: number;
}

export class TransferService {
  private db: Database.Database;
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;
  private dailyTransferRepo: DailyTransferRepository;

  constructor(
    db: Database.Database,
    accountRepository: AccountRepository,
    transactionRepository: TransactionRepository,
    dailyTransferRepository: DailyTransferRepository
  ) {
    this.db = db;
    this.accountRepo = accountRepository;
    this.transactionRepo = transactionRepository;
    this.dailyTransferRepo = dailyTransferRepository;
  }

  execute(fromId: string, toId: string, amount: number): TransferResult {
    const from = this.accountRepo.findById(fromId);
    if (!from) {
      throw new NotFoundError("Source account");
    }

    const to = this.accountRepo.findById(toId);
    if (!to) {
      throw new NotFoundError("Destination account");
    }

    if (from.balance < amount) {
      throw new ValidationError("Insufficient funds");
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyTotal = this.dailyTransferRepo.getDailyTotal(fromId, today);
    if (dailyTotal + amount > DAILY_TRANSFER_LIMIT) {
      throw new ValidationError("Daily transfer limit of $10,000 exceeded");
    }

    const doTransfer = this.db.transaction(() => {
      this.accountRepo.decrementBalance(fromId, amount);
      this.accountRepo.incrementBalance(toId, amount);

      this.transactionRepo.create(fromId, "transfer", amount, toId);
      this.transactionRepo.create(toId, "transfer", amount, fromId);

      this.dailyTransferRepo.addToDaily(fromId, today, amount);
    });

    doTransfer();

    return {
      fromAccount: this.accountRepo.findById(fromId)!,
      toAccount: this.accountRepo.findById(toId)!,
      amount,
    };
  }
}
