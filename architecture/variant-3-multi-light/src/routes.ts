import { Router, Request, Response } from "express";
import * as services from "./services";
import { validateAmount, validateCreateAccount, validateTransfer } from "./validators";

const router = Router();

router.post("/accounts", (req: Request, res: Response): void => {
  const err = validateCreateAccount(req.body);
  if (err) { res.status(400).json({ error: err }); return; }

  const result = services.createAccount(req.body.name, req.body.email);
  res.status(result.status).json(result.data || { error: result.error });
});

router.get("/accounts/:id", (req: Request, res: Response): void => {
  const account = services.findAccountById(req.params.id);
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(account);
});

router.post("/accounts/:id/deposit", (req: Request, res: Response): void => {
  const err = validateAmount(req.body && req.body.amount);
  if (err) { res.status(400).json({ error: err }); return; }

  const result = services.deposit(req.params.id, req.body.amount);
  res.status(result.status).json(result.data || { error: result.error });
});

router.post("/accounts/:id/withdraw", (req: Request, res: Response): void => {
  const err = validateAmount(req.body && req.body.amount);
  if (err) { res.status(400).json({ error: err }); return; }

  const result = services.withdraw(req.params.id, req.body.amount);
  res.status(result.status).json(result.data || { error: result.error });
});

router.post("/transfers", (req: Request, res: Response): void => {
  const err = validateTransfer(req.body);
  if (err) { res.status(400).json({ error: err }); return; }

  const { fromAccountId, toAccountId, amount } = req.body;
  const result = services.transfer(fromAccountId, toAccountId, amount);
  res.status(result.status).json(result.data || { error: result.error });
});

router.get("/accounts/:id/transactions", (req: Request, res: Response): void => {
  const account = services.findAccountById(req.params.id);
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const transactions = services.getTransactions(req.params.id, req.query.type as string | undefined);
  res.json(transactions);
});

export default router;
