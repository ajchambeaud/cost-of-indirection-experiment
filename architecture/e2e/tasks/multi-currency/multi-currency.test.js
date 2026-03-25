const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { post, get, createAccount, deposit, transfer, getBalance, getTransactions } = require("../../helpers");

describe("Multi-Currency Support", () => {
  describe("Account creation with currency", () => {
    it("should create an account with default USD currency", async () => {
      const res = await createAccount("DefaultCurrency", `default-cur-${Date.now()}@test.com`);
      assert.equal(res.status, 201);
      assert.equal(res.body.currency, "USD");
    });

    it("should create an account with EUR currency", async () => {
      const res = await post("/accounts", {
        name: "EuroUser",
        email: `euro-${Date.now()}@test.com`,
        currency: "EUR",
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.currency, "EUR");
    });

    it("should create an account with GBP currency", async () => {
      const res = await post("/accounts", {
        name: "GBPUser",
        email: `gbp-${Date.now()}@test.com`,
        currency: "GBP",
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.currency, "GBP");
    });

    it("should reject invalid currency", async () => {
      const res = await post("/accounts", {
        name: "BadCurrency",
        email: `bad-cur-${Date.now()}@test.com`,
        currency: "INVALID",
      });
      assert.equal(res.status, 400);
    });
  });

  describe("GET /accounts/:id with currency", () => {
    it("should return account with currency field", async () => {
      const created = await post("/accounts", {
        name: "CurrencyCheck",
        email: `cur-check-${Date.now()}@test.com`,
        currency: "EUR",
      });
      const res = await getBalance(created.body.id);
      assert.equal(res.status, 200);
      assert.equal(res.body.currency, "EUR");
    });
  });

  describe("Deposits and withdrawals with currency", () => {
    it("should deposit to a EUR account and reflect currency", async () => {
      const acct = await post("/accounts", {
        name: "EuroDeposit",
        email: `euro-dep-${Date.now()}@test.com`,
        currency: "EUR",
      });
      const res = await deposit(acct.body.id, 100);
      assert.equal(res.status, 200);
      assert.equal(res.body.balance, 100);
    });
  });

  describe("Transfers with currency", () => {
    it("should allow transfer between same-currency accounts", async () => {
      const a = await post("/accounts", {
        name: "EuroSender",
        email: `eur-send-${Date.now()}@test.com`,
        currency: "EUR",
      });
      const b = await post("/accounts", {
        name: "EuroReceiver",
        email: `eur-recv-${Date.now()}@test.com`,
        currency: "EUR",
      });
      await deposit(a.body.id, 500);

      const res = await transfer(a.body.id, b.body.id, 200);
      assert.equal(res.status, 201);

      const balA = await getBalance(a.body.id);
      const balB = await getBalance(b.body.id);
      assert.equal(balA.body.balance, 300);
      assert.equal(balB.body.balance, 200);
    });

    it("should reject transfer between different-currency accounts", async () => {
      const usd = await post("/accounts", {
        name: "USDSender",
        email: `usd-send-${Date.now()}@test.com`,
        currency: "USD",
      });
      const eur = await post("/accounts", {
        name: "EURReceiver",
        email: `eur-recv2-${Date.now()}@test.com`,
        currency: "EUR",
      });
      await deposit(usd.body.id, 500);

      const res = await transfer(usd.body.id, eur.body.id, 200);
      assert.equal(res.status, 400);

      // balance should be unchanged
      const bal = await getBalance(usd.body.id);
      assert.equal(bal.body.balance, 500);
    });
  });

  describe("Transaction history with currency", () => {
    it("should include currency in transaction records", async () => {
      const acct = await post("/accounts", {
        name: "TxCurrency",
        email: `tx-cur-${Date.now()}@test.com`,
        currency: "GBP",
      });
      await deposit(acct.body.id, 250);

      const res = await getTransactions(acct.body.id);
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].currency, "GBP");
    });
  });

  describe("GET /exchange-rates", () => {
    it("should return exchange rates", async () => {
      const res = await get("/exchange-rates");
      assert.equal(res.status, 200);
      assert.ok(res.body.rates);
      assert.ok(res.body.rates.USD);
      assert.ok(res.body.rates.EUR);
      assert.ok(res.body.rates.GBP);
    });

    it("should have USD as base rate of 1", async () => {
      const res = await get("/exchange-rates");
      assert.equal(res.body.rates.USD, 1);
    });
  });
});
