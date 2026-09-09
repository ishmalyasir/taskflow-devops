const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const User = require("../models/User");
const Task = require("../models/Task");

// @route GET /api/team
const getTeam = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ name: 1 });
  const team = await Promise.all(
    users.map(async (u) => {
      const [assigned, completed] = await Promise.all([
        Task.countDocuments({ assignee: u._id }),
        Task.countDocuments({ assignee: u._id, status: "Completed" }),
      ]);
      const productivity = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      return { ...u.toPublicJSON(), assigned, completed, productivity };
    })
  );
  sendSuccess(res, team);
});

module.exports = { getTeam };
