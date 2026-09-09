const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const generateToken = require("../utils/generateToken");
const User = require("../models/User");

function checkValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array().map((e) => e.msg).join(", "));
  }
}

// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  checkValidation(req);
  const { name, email, password, role, jobTitle } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({
    name,
    email,
    password,
    role: role === "admin" ? "admin" : "member",
    jobTitle: jobTitle || "Team Member",
  });

  const token = generateToken(user._id);
  sendSuccess(res, { user: user.toPublicJSON(), token }, 201);
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  checkValidation(req);
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = generateToken(user._id);
  sendSuccess(res, { user: user.toPublicJSON(), token });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user.toPublicJSON());
});

module.exports = { register, login, getMe };
