import { Router, Request, Response, NextFunction } from "express";
import { AccountUseCase } from "../../../domain/ports/in/AccountUseCase";
import { validateCreateAccount, validateAmount } from "../validators/accountValidator";

export function createAccountController(accountUseCase: AccountUseCase): Router {
  const router = Router();

  router.post("/", (req: Request, res: Response, next: NextFunction): void => {
    const err = validateCreateAccount(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    try {
      const account = accountUseCase.createAccount(req.body.name, req.body.email);
      res.status(201).json(account);
    } catch (e) {
      next(e);
    }
  });

  router.get("/:id", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const account = accountUseCase.getAccount(req.params.id);
      res.json(account);
    } catch (e) {
      next(e);
    }
  });

  router.post("/:id/deposit", (req: Request, res: Response, next: NextFunction): void => {
    const err = validateAmount(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    try {
      const result = accountUseCase.deposit(req.params.id, req.body.amount);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post("/:id/withdraw", (req: Request, res: Response, next: NextFunction): void => {
    const err = validateAmount(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    try {
      const result = accountUseCase.withdraw(req.params.id, req.body.amount);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
