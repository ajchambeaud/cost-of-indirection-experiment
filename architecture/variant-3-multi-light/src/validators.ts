export function validateAmount(amount: unknown): string | null {
  if (!amount || (typeof amount === "number" && amount < 1)) {
    return "Amount must be at least $1";
  }
  return null;
}

export function validateCreateAccount(body: Record<string, unknown>): string | null {
  if (!body || !body.name || !body.email) {
    return "Name and email are required";
  }
  return null;
}

export function validateTransfer(body: Record<string, unknown>): string | null {
  if (!body) return "Request body is required";

  const amountErr = validateAmount(body.amount);
  if (amountErr) return amountErr;

  if (body.fromAccountId === body.toAccountId) {
    return "Cannot transfer to same account";
  }
  return null;
}
