const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiResponse");
const User = require("../models/User");

// Verifies the "Authorization: Bearer <token>" header and attaches the
// authenticated user (minus password) to req.user.
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authorized — no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, "Not authorized — user no longer exists");
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Not authorized — invalid or expired token");
  }
});

// Restricts a route to specific roles, e.g. authorize("admin").
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
}

module.exports = { protect, authorize };
