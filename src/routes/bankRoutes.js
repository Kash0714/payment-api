const express = require("express");
const { body } = require("express-validator");
const { addBankAccount, getBankAccounts, deleteBankAccount, topUpBalance } = require("../controllers/bankController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router({ mergeParams: true });

// 3.1 Add Bank Account
router.post(
  "/",
  authenticate,
  [
    body("accountNumber").trim().notEmpty().withMessage("Account number is required"),
    body("bankName").trim().notEmpty().withMessage("Bank name is required"),
    body("accountHolderName").trim().notEmpty().withMessage("Account holder name is required"),
    body("currency").optional().isLength({ min: 3, max: 3 }).withMessage("Currency must be a 3-letter code (e.g. USD)"),
  ],
  validate,
  addBankAccount
);

// 3.2 Get Bank Accounts List
router.get("/", authenticate, getBankAccounts);

// 3.3 Delete Bank Account
router.delete("/:accountId", authenticate, deleteBankAccount);

// 3.4 Top-up Balance
router.post(
  "/:accountId/topup",
  authenticate,
  [body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number")],
  validate,
  topUpBalance
);

module.exports = router;
