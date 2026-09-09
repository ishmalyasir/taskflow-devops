const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const Task = require("../models/Task");
const Project = require("../models/Project");

// @route GET /api/analytics
// Aggregates everything the Analytics page needs in one call.
const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [tasksCompleted, tasksCreated, allTasks, overdue, projects] = await Promise.all([
    Task.countDocuments({ status: "Completed" }),
    Task.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Task.find({}, "priority project status createdAt updatedAt"),
    Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: "Completed" } }),
    Project.find().select("name"),
  ]);

  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  const priorityBreakdown = ["High", "Medium", "Low"].map((p) => ({
    name: p,
    value: allTasks.filter((t) => t.priority === p).length,
  }));

  const projectTaskCounts = projects.map((p) => ({
    name: p.name.split(" ")[0],
    tasks: allTasks.filter((t) => String(t.project) === String(p._id)).length,
    completed: allTasks.filter((t) => String(t.project) === String(p._id) && t.status === "Completed").length,
  }));

  // Weekly buckets within the current month (Wk 1..Wk 4+) by createdAt.
  const weekBuckets = {};
  allTasks.forEach((t) => {
    if (t.createdAt < startOfMonth) return;
    const week = Math.ceil((t.createdAt.getDate()) / 7);
    weekBuckets[week] = weekBuckets[week] || { created: 0, completed: 0 };
    weekBuckets[week].created += 1;
    if (t.status === "Completed") weekBuckets[week].completed += 1;
  });
  const monthlyTrend = Object.keys(weekBuckets).sort().map((w) => ({
    week: `Wk ${w}`,
    completed: weekBuckets[w].completed,
    created: weekBuckets[w].created,
  }));

  sendSuccess(res, {
    tasksCompleted, tasksCreated, completionRate, overdueTasks: overdue,
    priorityBreakdown, projectTaskCounts, monthlyTrend,
  });
});

module.exports = { getAnalytics };
