import { Request, Response, NextFunction } from "express";
import { DomainError } from "../../../domain/models/DomainError";

const ERROR_CODE_TO_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  DUPLICATE_EMAIL: 409,
  INSUFFICIENT_FUNDS: 400,
  INVALID_AMOUNT: 400,
  SELF_TRANSFER: 400,
  DAILY_LIMIT_EXCEEDED: 400,
};

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof DomainError) {
    const status = ERROR_CODE_TO_STATUS[err.code] || 500;
    res.status(status).json({ error: err.message });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
