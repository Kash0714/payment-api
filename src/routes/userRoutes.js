const express = require("express");
const { body } = require("express-validator");
const { createUser, updateUser, deleteUser, getUserProfile, getUsersList } = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// 1.1 Create User
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
  ],
  validate,
  createUser
);

// 1.5 Get Users List (protected)
router.get("/", authenticate, getUsersList);

// 1.4 Get User Profile (protected)
router.get("/:userId", authenticate, getUserProfile);

// 1.2 Update User (protected)
router.put(
  "/:userId",
  authenticate,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("phone").optional({ nullable: true }).isMobilePhone().withMessage("Invalid phone number"),
  ],
  validate,
  updateUser
);

// 1.3 Delete User (protected)
router.delete("/:userId", authenticate, deleteUser);

module.exports = router;
