import { Transaction } from "../../models/Transaction";

export interface TransactionRepository {
  create(accountId: string, type: string, amount: number, relatedAccountId?: string | null): string;
  findByAccountId(accountId: string, type?: string): Transaction[];
}
