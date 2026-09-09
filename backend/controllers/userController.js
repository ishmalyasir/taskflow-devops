const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const User = require("../models/User");
const Task = require("../models/Task");

// @route GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ name: 1 });
  sendSuccess(res, users.map((u) => u.toPublicJSON()));
});

// @route GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const [assigned, completed] = await Promise.all([
    Task.countDocuments({ assignee: user._id }),
    Task.countDocuments({ assignee: user._id, status: "Completed" }),
  ]);
  const productivity = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  sendSuccess(res, { ...user.toPublicJSON(), stats: { assigned, completed, productivity } });
});

// @route PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  // Only the account owner or an admin can edit a profile.
  if (String(user._id) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You can only edit your own profile");
  }

  const { name, jobTitle, bio, avatarColor } = req.body;
  if (name !== undefined) user.name = name;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  if (bio !== undefined) user.bio = bio;
  if (avatarColor !== undefined) user.avatarColor = avatarColor;

  await user.save();
  sendSuccess(res, user.toPublicJSON());
});

module.exports = { getUsers, getUserById, updateUser };
