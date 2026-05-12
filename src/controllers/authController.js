const bcrypt = require("bcryptjs");
const store = require("../models/store");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, ACCESS_EXPIRY, REFRESH_EXPIRY } = require("../utils/jwt");
const { success, error, unauthorized } = require("../utils/response");

// 2.1 Login User
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = [...store.users.values()].find(
      (u) => u.email === email.toLowerCase().trim() && !u.deleted
    );

    if (!user) {
      return unauthorized(res, "Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return unauthorized(res, "Invalid email or password");
    }

    const payload = { userId: user.userId, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    store.refreshTokens.add(refreshToken);

    return success(res, {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: ACCESS_EXPIRY,
      refreshTokenExpiresIn: REFRESH_EXPIRY,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
      },
    }, "Login successful");
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    return error(res, err.message || "Login failed", 500);
  }
}

// 2.2 Refresh Token
function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, "Refresh token is required", 400);
    }

    // Check if token is in our valid set
    if (!store.refreshTokens.has(refreshToken)) {
      return unauthorized(res, "Invalid or revoked refresh token");
    }

    const decoded = verifyRefreshToken(refreshToken);

    // Ensure user still exists
    const user = store.users.get(decoded.userId);
    if (!user || user.deleted) {
      store.refreshTokens.delete(refreshToken);
      return unauthorized(res, "User no longer exists");
    }

    const payload = { userId: decoded.userId, email: decoded.email };
    const newAccessToken = generateAccessToken(payload);

    return success(res, {
      accessToken: newAccessToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: ACCESS_EXPIRY,
    }, "Token refreshed successfully");
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      store.refreshTokens.delete(req.body.refreshToken);
      return unauthorized(res, "Refresh token expired, please login again");
    }
    return unauthorized(res, "Invalid refresh token");
  }
}

// Logout (invalidate refresh token)
function logoutUser(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    store.refreshTokens.delete(refreshToken);
  }
  return success(res, {}, "Logged out successfully");
}

module.exports = { loginUser, refreshToken, logoutUser };
