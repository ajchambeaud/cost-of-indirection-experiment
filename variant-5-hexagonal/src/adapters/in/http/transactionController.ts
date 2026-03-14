import { Router, Request, Response, NextFunction } from "express";
import { TransactionQueryUseCase } from "../../../domain/ports/in/TransactionQueryUseCase";

export function createTransactionController(transactionQueryUseCase: TransactionQueryUseCase): Router {
  const router = Router();

  router.get("/:id/transactions", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const transactions = transactionQueryUseCase.getTransactions(
        req.params.id,
        req.query.type as string | undefined
      );
      res.json(transactions);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
