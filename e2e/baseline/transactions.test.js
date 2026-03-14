const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccount,
  deposit,
  withdraw,
  transfer,
  getTransactions,
} = require("../helpers");

describe("Transaction History", () => {
  async function setupAccountWithHistory() {
    const acct = await createAccount(
      "HistoryUser",
      `history-${Date.now()}-${Math.random()}@test.com`
    );
    const other = await createAccount(
      "OtherUser",
      `other-${Date.now()}-${Math.random()}@test.com`
    );
    const id = acct.body.id;
    const otherId = other.body.id;

    await deposit(id, 1000);
    await withdraw(id, 100);
    await deposit(id, 50);
    await transfer(id, otherId, 200);

    return { id, otherId };
  }

  describe("GET /accounts/:id/transactions", () => {
    it("should return all transactions for an account", async () => {
      const { id } = await setupAccountWithHistory();
      const res = await getTransactions(id);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 4);
    });

    it("should include transaction details", async () => {
      const acct = await createAccount(
        "DetailUser",
        `detail-${Date.now()}@test.com`
      );
      await deposit(acct.body.id, 500);
      const res = await getTransactions(acct.body.id);

      assert.equal(res.body.length, 1);
      const tx = res.body[0];
      assert.ok(tx.id);
      assert.equal(tx.type, "deposit");
      assert.equal(tx.amount, 500);
      assert.ok(tx.createdAt || tx.created_at || tx.timestamp || tx.date);
    });

    it("should show correct transaction types", async () => {
      const { id } = await setupAccountWithHistory();
      const res = await getTransactions(id);

      const types = res.body.map((tx) => tx.type);
      assert.ok(types.includes("deposit"));
      assert.ok(types.includes("withdrawal"));
      assert.ok(types.includes("transfer"));
    });

    it("should filter by type", async () => {
      const { id } = await setupAccountWithHistory();
      const res = await getTransactions(id, "?type=deposit");
      assert.equal(res.status, 200);
      assert.ok(res.body.length >= 2);
      assert.ok(res.body.every((tx) => tx.type === "deposit"));
    });

    it("should return transactions in reverse chronological order", async () => {
      const { id } = await setupAccountWithHistory();
      const res = await getTransactions(id);

      for (let i = 1; i < res.body.length; i++) {
        const prev = new Date(
          res.body[i - 1].createdAt ||
            res.body[i - 1].created_at ||
            res.body[i - 1].timestamp ||
            res.body[i - 1].date
        );
        const curr = new Date(
          res.body[i].createdAt ||
            res.body[i].created_at ||
            res.body[i].timestamp ||
            res.body[i].date
        );
        assert.ok(prev >= curr, "Transactions should be in reverse chronological order");
      }
    });

    it("should return 404 for non-existent account", async () => {
      const res = await getTransactions("non-existent");
      assert.equal(res.status, 404);
    });

    it("should show transfer on both accounts", async () => {
      const { id, otherId } = await setupAccountWithHistory();

      const senderTxns = await getTransactions(id, "?type=transfer");
      const receiverTxns = await getTransactions(otherId, "?type=transfer");

      assert.ok(senderTxns.body.length >= 1);
      assert.ok(receiverTxns.body.length >= 1);
    });
  });
});
