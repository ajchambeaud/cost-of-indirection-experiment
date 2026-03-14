import { Router, Request, Response, NextFunction } from "express";
import { validate } from "../middleware/validate";
import { CreateAccountDTO, AmountDTO } from "../dto/AccountDTO";
import { AccountService } from "../services/AccountService";

export function createAccountRoutes(accountService: AccountService): Router {
  const router = Router();

  router.post("/", validate(CreateAccountDTO), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dto = (req as any).dto as CreateAccountDTO;
      const account = accountService.create(dto.name!, dto.email!);
      res.status(201).json(account);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const account = accountService.getById(req.params.id);
      res.json(account);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/deposit", validate(AmountDTO), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dto = (req as any).dto as AmountDTO;
      const result = accountService.deposit(req.params.id, dto.amount!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/withdraw", validate(AmountDTO), (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dto = (req as any).dto as AmountDTO;
      const result = accountService.withdraw(req.params.id, dto.amount!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
