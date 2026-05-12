const { v4: uuidv4 } = require("uuid");
const store = require("../models/store");
const { success, error, notFound, forbidden } = require("../utils/response");

const STATUS = { SUCCESS: "SUCCESS", FAILED: "FAILED" };

function findActiveAccount(accountId) {
  const acc = store.bankAccounts.get(accountId);
  if (!acc || acc.deleted) return null;
  return acc;
}

// 4.1 Do Payment
function doPayment(req, res) {
  const { senderAccountId, receiverAccountId, amount, description = "" } = req.body;
  const now = new Date().toISOString();
  const txnId = uuidv4();

  // Base transaction record
  const baseTxn = {
    transactionId: txnId,
    senderAccountId,
    receiverAccountId,
    amount,
    description,
    initiatedBy: req.user.userId,
    createdAt: now,
  };

  // --- Validations ---
  if (senderAccountId === receiverAccountId) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: "Sender and receiver accounts cannot be the same" };
    store.transactions.set(txnId, txn);
    return error(res, txn.failureReason, 400, { transaction: txn });
  }

  const sender = findActiveAccount(senderAccountId);
  if (!sender) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: "Sender account not found" };
    store.transactions.set(txnId, txn);
    return notFound(res, txn.failureReason);
  }

  // Only the sender account owner can initiate payment
  if (sender.userId !== req.user.userId) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: "You can only send payments from your own accounts" };
    store.transactions.set(txnId, txn);
    return forbidden(res, txn.failureReason);
  }

  const receiver = findActiveAccount(receiverAccountId);
  if (!receiver) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: "Receiver account not found" };
    store.transactions.set(txnId, txn);
    return notFound(res, txn.failureReason);
  }

  if (typeof amount !== "number" || amount <= 0) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: "Amount must be a positive number" };
    store.transactions.set(txnId, txn);
    return error(res, txn.failureReason, 400);
  }

  // Currency match check
  if (sender.currency !== receiver.currency) {
    const txn = { ...baseTxn, status: STATUS.FAILED, failureReason: `Currency mismatch: sender uses ${sender.currency}, receiver uses ${receiver.currency}` };
    store.transactions.set(txnId, txn);
    return error(res, txn.failureReason, 400);
  }

  // Insufficient balance check
  if (sender.balance < amount) {
    const txn = {
      ...baseTxn,
      status: STATUS.FAILED,
      failureReason: `Insufficient balance. Available: ${sender.balance} ${sender.currency}, Required: ${amount} ${sender.currency}`,
    };
    store.transactions.set(txnId, txn);
    return error(res, txn.failureReason, 400, { transaction: txn });
  }

  // --- Execute Payment ---
  sender.balance = parseFloat((sender.balance - amount).toFixed(2));
  sender.updatedAt = now;
  store.bankAccounts.set(senderAccountId, sender);

  receiver.balance = parseFloat((receiver.balance + amount).toFixed(2));
  receiver.updatedAt = now;
  store.bankAccounts.set(receiverAccountId, receiver);

  const txn = {
    ...baseTxn,
    status: STATUS.SUCCESS,
    currency: sender.currency,
    senderBalanceAfter: sender.balance,
    receiverBalanceAfter: receiver.balance,
  };
  store.transactions.set(txnId, txn);

  return success(res, { transaction: txn }, "Payment successful");
}

// 4.2 Get Transactions List by User
function getTransactions(req, res) {
  const { userId } = req.params;

  if (req.user.userId !== userId) {
    return forbidden(res, "You can only view your own transactions");
  }

  // Get all account IDs belonging to this user
  const userAccountIds = new Set(
    [...store.bankAccounts.values()]
      .filter((a) => a.userId === userId)
      .map((a) => a.accountId)
  );

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const statusFilter = req.query.status?.toUpperCase();

  let txns = [...store.transactions.values()].filter(
    (t) => userAccountIds.has(t.senderAccountId) || userAccountIds.has(t.receiverAccountId)
  );

  if (statusFilter && [STATUS.SUCCESS, STATUS.FAILED].includes(statusFilter)) {
    txns = txns.filter((t) => t.status === statusFilter);
  }

  // Sort newest first
  txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = txns.length;
  const start = (page - 1) * limit;
  const data = txns.slice(start, start + limit);

  return success(res, {
    transactions: data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }, "Transactions fetched successfully");
}

module.exports = { doPayment, getTransactions };
