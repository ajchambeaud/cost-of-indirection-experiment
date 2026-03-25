import express from "express";
import { createContainer } from "./config/container";
import { createAccountController } from "./adapters/in/http/accountController";
import { createTransferController } from "./adapters/in/http/transferController";
import { createTransactionController } from "./adapters/in/http/transactionController";
import { errorMiddleware } from "./adapters/in/http/errorMapper";

const { accountUseCase, transferUseCase, transactionQueryUseCase } = createContainer();

const app = express();
app.use(express.json());

app.use("/accounts", createAccountController(accountUseCase));
app.use("/accounts", createTransactionController(transactionQueryUseCase));
app.use("/transfers", createTransferController(transferUseCase));

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Variant 5 (hexagonal) running on port ${PORT}`);
});
