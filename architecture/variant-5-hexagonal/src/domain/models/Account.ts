export class Account {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly balance: number;
  readonly created_at: string;

  constructor(row: {
    id: string;
    name: string;
    email: string;
    balance: number;
    created_at: string;
  }) {
    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.balance = row.balance;
    this.created_at = row.created_at;
  }

  canWithdraw(amount: number): boolean {
    return this.balance >= amount;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      balance: this.balance,
      created_at: this.created_at,
    };
  }
}
