export class CreateAccountDTO {
  name?: string;
  email?: string;

  constructor(body: Record<string, unknown>) {
    this.name = body && (body.name as string);
    this.email = body && (body.email as string);
  }

  validate(): string | null {
    if (!this.name) return "Name is required";
    if (!this.email) return "Email is required";
    return null;
  }
}

export class AmountDTO {
  amount?: number;

  constructor(body: Record<string, unknown>) {
    this.amount = body && (body.amount as number);
  }

  validate(): string | null {
    if (!this.amount || this.amount < 1) return "Amount must be at least $1";
    return null;
  }
}

export class TransferDTO {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;

  constructor(body: Record<string, unknown>) {
    this.fromAccountId = body && (body.fromAccountId as string);
    this.toAccountId = body && (body.toAccountId as string);
    this.amount = body && (body.amount as number);
  }

  validate(): string | null {
    if (!this.amount || this.amount < 1) return "Amount must be at least $1";
    if (this.fromAccountId === this.toAccountId) return "Cannot transfer to same account";
    return null;
  }
}
