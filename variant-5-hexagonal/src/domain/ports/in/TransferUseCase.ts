import { Account } from "../../models/Account";

export interface TransferResult {
  fromAccount: Account;
  toAccount: Account;
  amount: number;
}

export interface TransferUseCase {
  executeTransfer(fromAccountId: string, toAccountId: string, amount: number): TransferResult;
}
