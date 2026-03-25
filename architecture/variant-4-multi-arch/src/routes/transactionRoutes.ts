import { Router, Request, Response, NextFunction } from "express";
import { TransactionQueryService } from "../services/TransactionQueryService";

export function createTransactionRoutes(transactionQueryService: TransactionQueryService): Router {
  const router = Router();

  router.get("/:id/transactions", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const transactions = transactionQueryService.getByAccountId(
        req.params.id,
        req.query.type as string | undefined
      );
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
