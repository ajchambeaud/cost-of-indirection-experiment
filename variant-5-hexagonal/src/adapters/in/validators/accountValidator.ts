export function validateCreateAccount(body: Record<string, unknown>): string | null {
  if (!body || !body.name || !body.email) {
    return "Name and email are required";
  }
  return null;
}

export function validateAmount(body: Record<string, unknown>): string | null {
  if (!body || !body.amount || (typeof body.amount === "number" && body.amount < 1)) {
    return "Amount must be at least $1";
  }
  return null;
}

export function validateTransfer(body: Record<string, unknown>): string | null {
  if (!body || !body.amount || (typeof body.amount === "number" && body.amount < 1)) {
    return "Amount must be at least $1";
  }
  if (body.fromAccountId === body.toAccountId) {
    return "Cannot transfer to same account";
  }
  return null;
}
