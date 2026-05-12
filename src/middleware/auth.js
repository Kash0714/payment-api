const { verifyAccessToken } = require("../utils/jwt");
const { unauthorized } = require("../utils/response");
const store = require("../models/store");

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res, "Access token missing or malformed");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);

    // Ensure user still exists
    const user = store.users.get(decoded.userId);
    if (!user || user.deleted) {
      return unauthorized(res, "User no longer exists");
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return unauthorized(res, "Access token expired");
    }
    return unauthorized(res, "Invalid access token");
  }
}

module.exports = { authenticate };
