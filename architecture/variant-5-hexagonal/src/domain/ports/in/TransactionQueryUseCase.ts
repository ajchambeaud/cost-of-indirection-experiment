import { Transaction } from "../../models/Transaction";

export interface TransactionQueryUseCase {
  getTransactions(accountId: string, type?: string): Transaction[];
}
