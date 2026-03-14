export class DomainError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}

export class AccountNotFoundError extends DomainError {
  constructor(detail: string = "Account") {
    super(`${detail} not found`, "NOT_FOUND");
  }
}

export class InsufficientFundsError extends DomainError {
  constructor() {
    super("Insufficient funds", "INSUFFICIENT_FUNDS");
  }
}

export class DuplicateEmailError extends DomainError {
  constructor() {
    super("Email already exists", "DUPLICATE_EMAIL");
  }
}

export class InvalidAmountError extends DomainError {
  constructor() {
    super("Amount must be at least $1", "INVALID_AMOUNT");
  }
}

export class SelfTransferError extends DomainError {
  constructor() {
    super("Cannot transfer to same account", "SELF_TRANSFER");
  }
}

export class DailyLimitExceededError extends DomainError {
  constructor() {
    super("Daily transfer limit of $10,000 exceeded", "DAILY_LIMIT_EXCEEDED");
  }
}
