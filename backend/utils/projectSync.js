const Task = require("../models/Task");
const Project = require("../models/Project");

// Recomputes a project's totalTasks/completedTasks/progress from its actual
// tasks. Called after any task create/delete/status change so the frontend's
// project cards and progress bars always reflect real data.
async function syncProjectCounters(projectId) {
  if (!projectId) return;
  const [totalTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: "Completed" }),
  ]);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  await Project.findByIdAndUpdate(projectId, { totalTasks, completedTasks, progress });
}

module.exports = { syncProjectCounters };
