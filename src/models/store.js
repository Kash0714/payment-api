/**
 * In-memory data store (simulates a database)
 */
const store = {
  users: new Map(),          // userId -> user object
  bankAccounts: new Map(),   // accountId -> account object
  transactions: new Map(),   // txnId -> transaction object
  refreshTokens: new Set(),  // valid refresh tokens
};

module.exports = store;
