const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccount,
  deposit,
  transfer,
  getBalance,
} = require("./helpers");

describe("Transfers", () => {
  async function setupTwoAccounts(balanceA = 1000, balanceB = 0) {
    const a = await createAccount("SenderT", `sender-${Date.now()}-${Math.random()}@test.com`);
    const b = await createAccount("ReceiverT", `receiver-${Date.now()}-${Math.random()}@test.com`);
    if (balanceA > 0) await deposit(a.body.id, balanceA);
    if (balanceB > 0) await deposit(b.body.id, balanceB);
    return [a.body.id, b.body.id];
  }

  describe("POST /transfers", () => {
    it("should transfer money between accounts", async () => {
      const [from, to] = await setupTwoAccounts(500, 0);
      const res = await transfer(from, to, 200);
      assert.equal(res.status, 201);

      const fromBal = await getBalance(from);
      const toBal = await getBalance(to);
      assert.equal(fromBal.body.balance, 300);
      assert.equal(toBal.body.balance, 200);
    });

    it("should reject transfer with insufficient funds", async () => {
      const [from, to] = await setupTwoAccounts(100, 0);
      const res = await transfer(from, to, 200);
      assert.equal(res.status, 400);

      // balances unchanged
      const fromBal = await getBalance(from);
      assert.equal(fromBal.body.balance, 100);
    });

    it("should reject transfer below $1", async () => {
      const [from, to] = await setupTwoAccounts(100, 0);
      const res = await transfer(from, to, 0.5);
      assert.equal(res.status, 400);
    });

    it("should reject transfer to self", async () => {
      const [from] = await setupTwoAccounts(100, 0);
      const res = await transfer(from, from, 50);
      assert.equal(res.status, 400);
    });

    it("should reject transfer from non-existent account", async () => {
      const [, to] = await setupTwoAccounts(0, 100);
      const res = await transfer("non-existent", to, 50);
      assert.equal(res.status, 404);
    });

    it("should reject transfer to non-existent account", async () => {
      const [from] = await setupTwoAccounts(100, 0);
      const res = await transfer(from, "non-existent", 50);
      assert.equal(res.status, 404);
    });

    it("should enforce daily transfer limit of $10,000", async () => {
      const [from, to] = await setupTwoAccounts(20000, 0);

      // first transfer of 8000 should work
      const res1 = await transfer(from, to, 8000);
      assert.equal(res1.status, 201);

      // second transfer of 3000 should fail (total would be 11000)
      const res2 = await transfer(from, to, 3000);
      assert.equal(res2.status, 400);

      // balances: sender should still have 12000
      const fromBal = await getBalance(from);
      assert.equal(fromBal.body.balance, 12000);
    });

    it("should handle concurrent-like transfers correctly", async () => {
      const [from, to] = await setupTwoAccounts(1000, 0);

      // fire 5 transfers of 100 each in parallel
      const results = await Promise.all(
        Array.from({ length: 5 }, () => transfer(from, to, 100))
      );

      const successes = results.filter((r) => r.status === 201);
      assert.equal(successes.length, 5);

      const fromBal = await getBalance(from);
      const toBal = await getBalance(to);
      assert.equal(fromBal.body.balance, 500);
      assert.equal(toBal.body.balance, 500);
    });
  });
});
