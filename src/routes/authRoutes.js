const express = require("express");
const { body } = require("express-validator");
const { loginUser, refreshToken, logoutUser } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// 2.1 Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  loginUser
);

// 2.2 Refresh Token
router.post(
  "/refresh-token",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  validate,
  refreshToken
);

// Logout
router.post("/logout", authenticate, logoutUser);

module.exports = router;
