Add multi-currency support to the wallet API. The requirements are:

1. **Account creation**: Accounts should accept an optional `currency` field (string) when created via `POST /accounts`. Supported currencies are: `USD`, `EUR`, `GBP`. Default to `USD` if not provided. Reject unsupported currencies with 400.

2. **Account response**: `GET /accounts/:id` should include the `currency` field in the response.

3. **Deposits and withdrawals**: Work the same as before. No changes to the endpoint signatures needed — the currency is inherent to the account.

4. **Transfers**: `POST /transfers` should reject transfers between accounts with different currencies (return 400 with an appropriate error message). Same-currency transfers work as before.

5. **Transaction history**: Each transaction in `GET /accounts/:id/transactions` should include a `currency` field reflecting the account's currency.

6. **Exchange rates endpoint**: Add a new `GET /exchange-rates` endpoint that returns a JSON object with `{ rates: { USD: 1, EUR: <rate>, GBP: <rate> } }`. The rates can be hardcoded.

The database schema needs to be updated to store the currency on accounts. Make sure existing tests still pass (backward compatible — accounts without a currency specified should default to USD).

Only modify files inside the current working directory. After making changes, build the project with `npx tsc` and verify it compiles.
