import { Router, Request, Response, NextFunction } from "express";
import { validate } from "../middleware/validate";
import { TransferDTO } from "../dto/AccountDTO";
import { TransferService } from "../services/TransferService";

export function createTransferRoutes(transferService: TransferService): Router {
  const router = Router();

  router.post("/", validate(TransferDTO), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dto = (req as any).dto as TransferDTO;
      const result = transferService.execute(dto.fromAccountId!, dto.toAccountId!, dto.amount!);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
