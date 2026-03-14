export class Transaction {
  readonly id: string;
  readonly account_id: string;
  readonly type: "deposit" | "withdrawal" | "transfer";
  readonly amount: number;
  readonly related_account_id: string | null;
  readonly created_at: string;

  constructor(row: {
    id: string;
    account_id: string;
    type: "deposit" | "withdrawal" | "transfer";
    amount: number;
    related_account_id: string | null;
    created_at: string;
  }) {
    this.id = row.id;
    this.account_id = row.account_id;
    this.type = row.type;
    this.amount = row.amount;
    this.related_account_id = row.related_account_id;
    this.created_at = row.created_at;
  }

  toJSON() {
    return {
      id: this.id,
      account_id: this.account_id,
      type: this.type,
      amount: this.amount,
      related_account_id: this.related_account_id,
      created_at: this.created_at,
    };
  }
}
