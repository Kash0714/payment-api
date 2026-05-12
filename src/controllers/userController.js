const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const store = require("../models/store");
const { success, created, error, notFound } = require("../utils/response");

// Helper: sanitize user for output (strip password)
function sanitizeUser(user) {
  const { password, deleted, ...safe } = user;
  return safe;
}

// Helper: find active user
function findUser(userId) {
  const user = store.users.get(userId);
  if (!user || user.deleted) return null;
  return user;
}

// 1.1 Create User
async function createUser(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    // Check email uniqueness
    const emailExists = [...store.users.values()].some(
      (u) => u.email === email.toLowerCase() && !u.deleted
    );
    if (emailExists) {
      return error(res, "Email already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const user = {
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || null,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    store.users.set(userId, user);
    return created(res, sanitizeUser(user), "User created successfully");
  } catch (err) {
    return error(res, "Failed to create user", 500);
  }
}

// 1.2 Update User
async function updateUser(req, res) {
  try {
    const { userId } = req.params;

    // Allow users to update only their own profile
    if (req.user.userId !== userId) {
      return error(res, "You can only update your own profile", 403);
    }

    const user = findUser(userId);
    if (!user) return notFound(res, "User not found");

    const { name, phone, password } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (password) user.password = await bcrypt.hash(password, 10);
    user.updatedAt = new Date().toISOString();

    store.users.set(userId, user);
    return success(res, sanitizeUser(user), "User updated successfully");
  } catch (err) {
    return error(res, "Failed to update user", 500);
  }
}

// 1.3 Delete User
function deleteUser(req, res) {
  const { userId } = req.params;

  if (req.user.userId !== userId) {
    return error(res, "You can only delete your own account", 403);
  }

  const user = findUser(userId);
  if (!user) return notFound(res, "User not found");

  // Soft delete
  user.deleted = true;
  user.updatedAt = new Date().toISOString();
  store.users.set(userId, user);

  return success(res, {}, "User deleted successfully");
}

// 1.4 Get User Profile
function getUserProfile(req, res) {
  const { userId } = req.params;

  const user = findUser(userId);
  if (!user) return notFound(res, "User not found");

  return success(res, sanitizeUser(user), "User profile fetched successfully");
}

// 1.5 Get Users List
function getUsersList(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

  const activeUsers = [...store.users.values()]
    .filter((u) => !u.deleted)
    .map(sanitizeUser)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = activeUsers.length;
  const start = (page - 1) * limit;
  const data = activeUsers.slice(start, start + limit);

  return success(
    res,
    {
      users: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Users fetched successfully"
  );
}

module.exports = { createUser, updateUser, deleteUser, getUserProfile, getUsersList };
