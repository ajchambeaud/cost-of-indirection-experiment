import { Router, Request, Response, NextFunction } from "express";
import { TransferUseCase } from "../../../domain/ports/in/TransferUseCase";
import { validateTransfer } from "../validators/accountValidator";

export function createTransferController(transferUseCase: TransferUseCase): Router {
  const router = Router();

  router.post("/", (req: Request, res: Response, next: NextFunction): void => {
    const err = validateTransfer(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    try {
      const result = transferUseCase.executeTransfer(
        req.body.fromAccountId,
        req.body.toAccountId,
        req.body.amount
      );
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
