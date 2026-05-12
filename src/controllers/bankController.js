const { v4: uuidv4 } = require("uuid");
const store = require("../models/store");
const { success, created, error, notFound, forbidden } = require("../utils/response");

const MAX_ACCOUNTS_PER_USER = 3;

// Helper: get active accounts for a user
function getUserAccounts(userId) {
  return [...store.bankAccounts.values()].filter(
    (a) => a.userId === userId && !a.deleted
  );
}

// Helper: find active account
function findAccount(accountId) {
  const acc = store.bankAccounts.get(accountId);
  if (!acc || acc.deleted) return null;
  return acc;
}

// 3.1 Add User Bank Account
function addBankAccount(req, res) {
  const { userId } = req.params;

  if (req.user.userId !== userId) {
    return forbidden(res, "You can only manage your own bank accounts");
  }

  const userAccounts = getUserAccounts(userId);
  if (userAccounts.length >= MAX_ACCOUNTS_PER_USER) {
    return error(res, `Maximum ${MAX_ACCOUNTS_PER_USER} bank accounts allowed per user`, 400);
  }

  const { accountNumber, bankName, accountHolderName, currency = "USD" } = req.body;

  // Check duplicate account number for this user
  const duplicate = userAccounts.find((a) => a.accountNumber === accountNumber);
  if (duplicate) {
    return error(res, "This account number is already added", 409);
  }

  const accountId = uuidv4();
  const now = new Date().toISOString();

  const account = {
    accountId,
    userId,
    accountNumber,
    bankName: bankName.trim(),
    accountHolderName: accountHolderName.trim(),
    currency: currency.toUpperCase(),
    balance: 0,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };

  store.bankAccounts.set(accountId, account);

  const { deleted, ...safe } = account;
  return created(res, safe, "Bank account added successfully");
}

// 3.2 Get User Bank Accounts List
function getBankAccounts(req, res) {
  const { userId } = req.params;

  if (req.user.userId !== userId) {
    return forbidden(res, "You can only view your own bank accounts");
  }

  const accounts = getUserAccounts(userId).map(({ deleted, ...safe }) => safe);

  return success(res, { accounts, total: accounts.length }, "Bank accounts fetched successfully");
}

// 3.3 Delete User Bank Account
function deleteBankAccount(req, res) {
  const { userId, accountId } = req.params;

  if (req.user.userId !== userId) {
    return forbidden(res, "You can only delete your own bank accounts");
  }

  const account = findAccount(accountId);
  if (!account) return notFound(res, "Bank account not found");

  if (account.userId !== userId) {
    return forbidden(res, "This account does not belong to you");
  }

  account.deleted = true;
  account.updatedAt = new Date().toISOString();
  store.bankAccounts.set(accountId, account);

  return success(res, {}, "Bank account deleted successfully");
}

// 3.4 Top-up User Bank Account Balance
function topUpBalance(req, res) {
  const { userId, accountId } = req.params;
  const { amount } = req.body;

  if (req.user.userId !== userId) {
    return forbidden(res, "You can only top up your own bank accounts");
  }

  const account = findAccount(accountId);
  if (!account) return notFound(res, "Bank account not found");

  if (account.userId !== userId) {
    return forbidden(res, "This account does not belong to you");
  }

  if (typeof amount !== "number" || amount <= 0) {
    return error(res, "Amount must be a positive number", 400);
  }

  account.balance = parseFloat((account.balance + amount).toFixed(2));
  account.updatedAt = new Date().toISOString();
  store.bankAccounts.set(accountId, account);

  const { deleted, ...safe } = account;
  return success(res, safe, `Top-up successful. New balance: ${account.balance} ${account.currency}`);
}

module.exports = { addBankAccount, getBankAccounts, deleteBankAccount, topUpBalance };
