const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createAccount, getBalance, deposit, withdraw } = require("./helpers");

describe("Accounts", () => {
  describe("POST /accounts", () => {
    it("should create an account", async () => {
      const res = await createAccount("Alice", "alice@test.com");
      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.name, "Alice");
      assert.equal(res.body.email, "alice@test.com");
      assert.equal(res.body.balance, 0);
    });

    it("should reject missing name", async () => {
      const res = await createAccount(undefined, "no-name@test.com");
      assert.equal(res.status, 400);
    });

    it("should reject missing email", async () => {
      const res = await createAccount("NoEmail", undefined);
      assert.equal(res.status, 400);
    });

    it("should reject duplicate email", async () => {
      const email = `dup-${Date.now()}@test.com`;
      await createAccount("First", email);
      const res = await createAccount("Second", email);
      assert.equal(res.status, 409);
    });
  });

  describe("GET /accounts/:id", () => {
    it("should return account with balance", async () => {
      const created = await createAccount("Bob", `bob-${Date.now()}@test.com`);
      const res = await getBalance(created.body.id);
      assert.equal(res.status, 200);
      assert.equal(res.body.name, "Bob");
      assert.equal(res.body.balance, 0);
    });

    it("should return 404 for non-existent account", async () => {
      const res = await getBalance("non-existent-id");
      assert.equal(res.status, 404);
    });
  });

  describe("POST /accounts/:id/deposit", () => {
    it("should deposit money", async () => {
      const acct = await createAccount("Carol", `carol-${Date.now()}@test.com`);
      const res = await deposit(acct.body.id, 100);
      assert.equal(res.status, 200);
      assert.equal(res.body.balance, 100);
    });

    it("should accumulate deposits", async () => {
      const acct = await createAccount("Dave", `dave-${Date.now()}@test.com`);
      await deposit(acct.body.id, 50);
      const res = await deposit(acct.body.id, 30);
      assert.equal(res.body.balance, 80);
    });

    it("should reject deposit below $1", async () => {
      const acct = await createAccount("Eve", `eve-${Date.now()}@test.com`);
      const res = await deposit(acct.body.id, 0.5);
      assert.equal(res.status, 400);
    });

    it("should reject negative deposit", async () => {
      const acct = await createAccount("Frank", `frank-${Date.now()}@test.com`);
      const res = await deposit(acct.body.id, -10);
      assert.equal(res.status, 400);
    });

    it("should return 404 for non-existent account", async () => {
      const res = await deposit("non-existent", 100);
      assert.equal(res.status, 404);
    });
  });

  describe("POST /accounts/:id/withdraw", () => {
    it("should withdraw money", async () => {
      const acct = await createAccount("Grace", `grace-${Date.now()}@test.com`);
      await deposit(acct.body.id, 200);
      const res = await withdraw(acct.body.id, 50);
      assert.equal(res.status, 200);
      assert.equal(res.body.balance, 150);
    });

    it("should reject overdraft", async () => {
      const acct = await createAccount("Hank", `hank-${Date.now()}@test.com`);
      await deposit(acct.body.id, 100);
      const res = await withdraw(acct.body.id, 150);
      assert.equal(res.status, 400);
    });

    it("should reject withdrawal below $1", async () => {
      const acct = await createAccount("Ivy", `ivy-${Date.now()}@test.com`);
      await deposit(acct.body.id, 100);
      const res = await withdraw(acct.body.id, 0.5);
      assert.equal(res.status, 400);
    });

    it("should return 404 for non-existent account", async () => {
      const res = await withdraw("non-existent", 50);
      assert.equal(res.status, 404);
    });
  });
});
