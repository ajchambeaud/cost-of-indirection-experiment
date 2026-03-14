export interface AccountRow {
  id: string;
  name: string;
  email: string;
  balance: number;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  related_account_id: string | null;
  created_at: string;
}

export interface DailyTransferRow {
  total: number;
}

export interface ServiceResult<T = AccountRow> {
  data?: T;
  error?: string;
  status: number;
}

export interface TransferResult {
  fromAccount: AccountRow;
  toAccount: AccountRow;
  amount: number;
}
