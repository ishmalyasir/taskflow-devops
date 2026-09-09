const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Project = require("../models/Project");

// @route GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [total, completed, inProgress, overdue, myPending] = await Promise.all([
    Task.countDocuments({}),
    Task.countDocuments({ status: "Completed" }),
    Task.countDocuments({ status: "In Progress" }),
    Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: "Completed" } }),
    Task.countDocuments({ assignee: req.user._id, status: { $ne: "Completed" } }),
  ]);
  sendSuccess(res, { total, completed, inProgress, overdue, myPending });
});

// @route GET /api/dashboard/productivity
// Tasks completed per day for the last 7 days, shaped for the existing chart.
const getProductivity = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const completions = await Activity.aggregate([
    { $match: { type: "task_completed", createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, tasks: { $sum: 1 } } },
  ]);
  const byDate = Object.fromEntries(completions.map((c) => [c._id, c.tasks]));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), tasks: byDate[key] || 0 });
  }
  sendSuccess(res, days);
});

// @route GET /api/dashboard/priority-breakdown
const getPriorityBreakdown = asyncHandler(async (req, res) => {
  const rows = await Task.aggregate([{ $group: { _id: "$priority", value: { $sum: 1 } } }]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.value]));
  sendSuccess(res, [
    { name: "High", value: map.High || 0 },
    { name: "Medium", value: map.Medium || 0 },
    { name: "Low", value: map.Low || 0 },
  ]);
});

// @route GET /api/dashboard/project-progress
const getProjectProgress = asyncHandler(async (req, res) => {
  const projects = await Project.find().select("name progress totalTasks completedTasks color dueDate");
  sendSuccess(res, projects);
});

module.exports = { getStats, getProductivity, getPriorityBreakdown, getProjectProgress };
