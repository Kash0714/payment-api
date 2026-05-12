/**
 * LeadMax Payment API – Integration Test Suite
 * Run with: node tests/test.js
 */

const http = require("http");
const app = require("../src/app");

// ── Test runner ──────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, extra = "") {
  if (condition) {
    passed++;
    results.push(`  ✅  ${label}`);
  } else {
    failed++;
    results.push(`  ❌  ${label}${extra ? " → " + extra : ""}`);
  }
}

// ── HTTP helper ──────────────────────────────────────────
let server;
let BASE;

async function req(method, path, body = null, token = null) {
  const url = `${BASE}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ── Test suites ──────────────────────────────────────────
async function runTests() {
  console.log("\n═══════════════════════════════════════════");
  console.log("   LeadMax Payment API — Test Suite");
  console.log("═══════════════════════════════════════════\n");

  // ── 1. User APIs ─────────────────────────────────────
  console.log("📁  1. User APIs");

  // 1.1 Create User
  const u1 = await req("POST", "/api/v1/users", { name: "Alice", email: "alice@test.com", password: "pass123" });
  assert("1.1 Create user – 201", u1.status === 201);
  assert("1.1 Create user – has userId", !!u1.body.data?.userId);
  const aliceId = u1.body.data?.userId;

  const u1b = await req("POST", "/api/v1/users", { name: "Bob", email: "bob@test.com", password: "pass123" });
  assert("1.1 Create second user – 201", u1b.status === 201);
  const bobId = u1b.body.data?.userId;

  const dupEmail = await req("POST", "/api/v1/users", { name: "Alice2", email: "alice@test.com", password: "pass123" });
  assert("1.1 Duplicate email – 409", dupEmail.status === 409);

  const badUser = await req("POST", "/api/v1/users", { name: "X", email: "not-an-email", password: "123" });
  assert("1.1 Invalid data – 422", badUser.status === 422);

  // ── 2. Auth APIs ──────────────────────────────────────
  console.log("\n📁  2. Auth APIs");

  // 2.1 Login
  const login = await req("POST", "/api/v1/auth/login", { email: "alice@test.com", password: "pass123" });
  assert("2.1 Login – 200", login.status === 200);
  assert("2.1 Login – access token present", !!login.body.data?.accessToken);
  assert("2.1 Login – refresh token present", !!login.body.data?.refreshToken);
  const aliceAccess = login.body.data?.accessToken;
  const aliceRefresh = login.body.data?.refreshToken;

  const loginFail = await req("POST", "/api/v1/auth/login", { email: "alice@test.com", password: "wrong" });
  assert("2.1 Wrong password – 401", loginFail.status === 401);

  const loginBob = await req("POST", "/api/v1/auth/login", { email: "bob@test.com", password: "pass123" });
  const bobAccess = loginBob.body.data?.accessToken;
  const bobRefresh = loginBob.body.data?.refreshToken;

  // 2.2 Refresh token
  const refresh = await req("POST", "/api/v1/auth/refresh-token", { refreshToken: aliceRefresh });
  assert("2.2 Refresh token – 200", refresh.status === 200);
  assert("2.2 Refresh token – new access token", !!refresh.body.data?.accessToken);

  const badRefresh = await req("POST", "/api/v1/auth/refresh-token", { refreshToken: "invalid.token.here" });
  assert("2.2 Invalid refresh token – 401", badRefresh.status === 401);

  // ── 1. User APIs (authenticated) ─────────────────────
  console.log("\n📁  1. User APIs (cont.)");

  // 1.4 Get User Profile
  const profile = await req("GET", `/api/v1/users/${aliceId}`, null, aliceAccess);
  assert("1.4 Get profile – 200", profile.status === 200);
  assert("1.4 Profile has name", profile.body.data?.name === "Alice");
  assert("1.4 Password not exposed", !profile.body.data?.password);

  // 1.5 Get Users List
  const list = await req("GET", "/api/v1/users", null, aliceAccess);
  assert("1.5 Get users list – 200", list.status === 200);
  assert("1.5 List has users array", Array.isArray(list.body.data?.users));
  assert("1.5 List has pagination", !!list.body.data?.pagination);

  // 1.2 Update User
  const update = await req("PUT", `/api/v1/users/${aliceId}`, { name: "Alice Updated" }, aliceAccess);
  assert("1.2 Update own user – 200", update.status === 200);
  assert("1.2 Name updated", update.body.data?.name === "Alice Updated");

  const updateOther = await req("PUT", `/api/v1/users/${bobId}`, { name: "Hacked" }, aliceAccess);
  assert("1.2 Cannot update other user – 403", updateOther.status === 403);

  // Unauthenticated request
  const unauth = await req("GET", `/api/v1/users/${aliceId}`);
  assert("Auth – missing token – 401", unauth.status === 401);

  // ── 3. Bank Account APIs ──────────────────────────────
  console.log("\n📁  3. Bank Account APIs");

  // 3.1 Add Bank Account
  const acc1 = await req("POST", `/api/v1/users/${aliceId}/bank-accounts`, {
    accountNumber: "ACC-001",
    bankName: "Chase",
    accountHolderName: "Alice Updated",
    currency: "USD",
  }, aliceAccess);
  assert("3.1 Add bank account – 201", acc1.status === 201);
  const acc1Id = acc1.body.data?.accountId;

  const acc2 = await req("POST", `/api/v1/users/${aliceId}/bank-accounts`, {
    accountNumber: "ACC-002",
    bankName: "Wells Fargo",
    accountHolderName: "Alice Updated",
  }, aliceAccess);
  assert("3.1 Add second account – 201", acc2.status === 201);
  const acc2Id = acc2.body.data?.accountId;

  const acc3 = await req("POST", `/api/v1/users/${aliceId}/bank-accounts`, {
    accountNumber: "ACC-003",
    bankName: "Citi",
    accountHolderName: "Alice",
  }, aliceAccess);
  assert("3.1 Add third account – 201", acc3.status === 201);

  const acc4 = await req("POST", `/api/v1/users/${aliceId}/bank-accounts`, {
    accountNumber: "ACC-004",
    bankName: "BofA",
    accountHolderName: "Alice",
  }, aliceAccess);
  assert("3.1 4th account blocked (max 3) – 400", acc4.status === 400);

  // 3.2 Get Bank Accounts
  const accounts = await req("GET", `/api/v1/users/${aliceId}/bank-accounts`, null, aliceAccess);
  assert("3.2 Get accounts – 200", accounts.status === 200);
  assert("3.2 Returns 3 accounts", accounts.body.data?.accounts?.length === 3);

  // Bob adds his account
  const bobAcc = await req("POST", `/api/v1/users/${bobId}/bank-accounts`, {
    accountNumber: "BOB-001",
    bankName: "HSBC",
    accountHolderName: "Bob",
    currency: "USD",
  }, bobAccess);
  const bobAccId = bobAcc.body.data?.accountId;

  // 3.4 Top-up Balance
  const topup = await req("POST", `/api/v1/users/${aliceId}/bank-accounts/${acc1Id}/topup`, { amount: 1000 }, aliceAccess);
  assert("3.4 Top-up – 200", topup.status === 200);
  assert("3.4 Balance updated to 1000", topup.body.data?.balance === 1000);

  const topup2 = await req("POST", `/api/v1/users/${aliceId}/bank-accounts/${acc1Id}/topup`, { amount: 500.50 }, aliceAccess);
  assert("3.4 Top-up again – balance 1500.50", topup2.body.data?.balance === 1500.50);

  const badTopup = await req("POST", `/api/v1/users/${aliceId}/bank-accounts/${acc1Id}/topup`, { amount: -100 }, aliceAccess);
  assert("3.4 Negative top-up – 422", badTopup.status === 422);

  // Top-up Bob's account
  await req("POST", `/api/v1/users/${bobId}/bank-accounts/${bobAccId}/topup`, { amount: 200 }, bobAccess);

  // 3.3 Delete Bank Account
  const del = await req("DELETE", `/api/v1/users/${aliceId}/bank-accounts/${acc2Id}`, null, aliceAccess);
  assert("3.3 Delete account – 200", del.status === 200);

  const afterDel = await req("GET", `/api/v1/users/${aliceId}/bank-accounts`, null, aliceAccess);
  assert("3.3 Account removed from list", afterDel.body.data?.accounts?.length === 2);

  // ── 4. Payment APIs ───────────────────────────────────
  console.log("\n📁  4. Payment APIs");

  // 4.1 Successful payment
  const pay1 = await req("POST", "/api/v1/payments", {
    senderAccountId: acc1Id,
    receiverAccountId: bobAccId,
    amount: 100,
    description: "Test payment",
  }, aliceAccess);
  assert("4.1 Successful payment – 200", pay1.status === 200);
  assert("4.1 Transaction status SUCCESS", pay1.body.data?.transaction?.status === "SUCCESS");
  assert("4.1 Sender balance deducted", pay1.body.data?.transaction?.senderBalanceAfter === 1400.50);
  assert("4.1 Receiver balance credited", pay1.body.data?.transaction?.receiverBalanceAfter === 300);

  // 4.1 Insufficient balance
  const pay2 = await req("POST", "/api/v1/payments", {
    senderAccountId: acc1Id,
    receiverAccountId: bobAccId,
    amount: 9999,
  }, aliceAccess);
  assert("4.1 Insufficient balance – 400", pay2.status === 400);

  // 4.1 Same account
  const pay3 = await req("POST", "/api/v1/payments", {
    senderAccountId: acc1Id,
    receiverAccountId: acc1Id,
    amount: 10,
  }, aliceAccess);
  assert("4.1 Same account – 400", pay3.status === 400);

  // 4.1 Send from someone else's account
  const pay4 = await req("POST", "/api/v1/payments", {
    senderAccountId: bobAccId,
    receiverAccountId: acc1Id,
    amount: 10,
  }, aliceAccess);
  assert("4.1 Cannot use other's account – 403", pay4.status === 403);

  // 4.1 Zero amount
  const pay5 = await req("POST", "/api/v1/payments", {
    senderAccountId: acc1Id,
    receiverAccountId: bobAccId,
    amount: 0,
  }, aliceAccess);
  assert("4.1 Zero amount – 422", pay5.status === 422);

  // 4.2 Get Transactions
  const txns = await req("GET", `/api/v1/payments/user/${aliceId}`, null, aliceAccess);
  assert("4.2 Get transactions – 200", txns.status === 200);
  assert("4.2 Has transactions array", Array.isArray(txns.body.data?.transactions));
  assert("4.2 Transactions count ≥ 1", txns.body.data?.transactions?.length >= 1);
  assert("4.2 Has pagination", !!txns.body.data?.pagination);

  // Filter by status
  const successTxns = await req("GET", `/api/v1/payments/user/${aliceId}?status=SUCCESS`, null, aliceAccess);
  assert("4.2 Filter by SUCCESS status", successTxns.body.data?.transactions?.every(t => t.status === "SUCCESS"));

  // Cannot view other user's transactions
  const bobTxns = await req("GET", `/api/v1/payments/user/${bobId}`, null, aliceAccess);
  assert("4.2 Cannot view other's transactions – 403", bobTxns.status === 403);

  // ── 1.3 Delete User ───────────────────────────────────
  console.log("\n📁  1. User APIs (delete)");

  const del2 = await req("DELETE", `/api/v1/users/${aliceId}`, null, aliceAccess);
  assert("1.3 Delete user – 200", del2.status === 200);

  const afterDeleteProfile = await req("GET", `/api/v1/users/${aliceId}`, null, bobAccess);
  assert("1.3 Deleted user not found – 404", afterDeleteProfile.status === 404);

  // ── Summary ───────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("   Results");
  console.log("═══════════════════════════════════════════");
  results.forEach((r) => console.log(r));
  console.log(`\n📊  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
  if (failed === 0) {
    console.log("🎉  All tests passed!\n");
  } else {
    console.log(`⚠️   ${failed} test(s) failed.\n`);
  }
}

// ── Bootstrap ─────────────────────────────────────────────
server = http.createServer(app);
server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address();
  BASE = `http://127.0.0.1:${port}`;
  try {
    await runTests();
  } finally {
    server.close();
  }
});
