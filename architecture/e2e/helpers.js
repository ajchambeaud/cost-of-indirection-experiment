const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`);
  // re-do with proper method since fetch GET ignores body
  if (method !== "GET") {
    const res2 = await fetch(`${BASE_URL}${path}`, opts);
    return {
      status: res2.status,
      body: await res2.json().catch(() => null),
    };
  }
  return {
    status: res.status,
    body: await res.json().catch(() => null),
  };
}

async function post(path, body) {
  return request("POST", path, body);
}

async function get(path) {
  return request("GET", path);
}

async function createAccount(name, email) {
  return post("/accounts", { name, email });
}

async function deposit(accountId, amount) {
  return post(`/accounts/${accountId}/deposit`, { amount });
}

async function withdraw(accountId, amount) {
  return post(`/accounts/${accountId}/withdraw`, { amount });
}

async function transfer(fromId, toId, amount) {
  return post("/transfers", {
    fromAccountId: fromId,
    toAccountId: toId,
    amount,
  });
}

async function getBalance(accountId) {
  return get(`/accounts/${accountId}`);
}

async function getTransactions(accountId, query = "") {
  return get(`/accounts/${accountId}/transactions${query}`);
}

module.exports = {
  BASE_URL,
  post,
  get,
  createAccount,
  deposit,
  withdraw,
  transfer,
  getBalance,
  getTransactions,
};
