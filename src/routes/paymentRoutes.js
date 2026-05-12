const express = require("express");
const { body } = require("express-validator");
const { doPayment, getTransactions } = require("../controllers/paymentController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// 4.1 Do Payment
router.post(
  "/",
  authenticate,
  [
    body("senderAccountId").notEmpty().withMessage("Sender account ID is required"),
    body("receiverAccountId").notEmpty().withMessage("Receiver account ID is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
    body("description").optional().isString(),
  ],
  validate,
  doPayment
);

// 4.2 Get Transactions by User
router.get("/user/:userId", authenticate, getTransactions);

module.exports = router;
