import express from "express";
import { createContainer } from "./container";
import { createAccountRoutes } from "./routes/accountRoutes";
import { createTransferRoutes } from "./routes/transferRoutes";
import { createTransactionRoutes } from "./routes/transactionRoutes";
import { errorHandler } from "./middleware/errorHandler";

const { accountService, transferService, transactionQueryService } = createContainer();

const app = express();
app.use(express.json());

app.use("/accounts", createAccountRoutes(accountService));
app.use("/accounts", createTransactionRoutes(transactionQueryService));
app.use("/transfers", createTransferRoutes(transferService));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Variant 4 (multi-arch) running on port ${PORT}`);
});
