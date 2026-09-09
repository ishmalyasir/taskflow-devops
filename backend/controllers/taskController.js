const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { syncProjectCounters } = require("../utils/projectSync");

async function logActivity(taskId, userId, type, text) {
  await Activity.create({ task: taskId, user: userId, type, text });
}

async function notifyUser(userId, text, kind, extra = {}) {
  if (!userId) return;
  await Notification.create({ user: userId, text, kind, ...extra });
}

const populateOpts = [
  { path: "assignee", select: "name email jobTitle avatarColor" },
  { path: "createdBy", select: "name email" },
  { path: "project", select: "name color" },
];

// @route GET /api/tasks
// Supports: ?project=&status=&priority=&assignee=&search=&sort=
const getTasks = asyncHandler(async (req, res) => {
  const { project, status, priority, assignee, search, sort } = req.query;
  const filter = {};
  if (project) filter.project = project;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (search) filter.$text = { $search: search };

  let query = Task.find(filter).populate(populateOpts);
  query = sort === "dueDate" ? query.sort({ dueDate: 1 }) : query.sort({ createdAt: -1 });

  const tasks = await query;
  sendSuccess(res, tasks);
});

// @route GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(populateOpts);
  if (!task) throw new ApiError(404, "Task not found");

  const [comments, activity] = await Promise.all([
    Comment.find({ task: task._id }).populate("user", "name jobTitle avatarColor").sort({ createdAt: 1 }),
    Activity.find({ task: task._id }).populate("user", "name").sort({ createdAt: 1 }),
  ]);

  sendSuccess(res, { ...task.toObject(), comments, activity });
});

// @route POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description, project, priority, status, assignee, dueDate, tags, checklist } = req.body;
  if (!title || !project || !assignee) {
    throw new ApiError(400, "title, project and assignee are required");
  }

  const task = await Task.create({
    title, description, project, priority, status, assignee, dueDate, tags, checklist,
    createdBy: req.user._id,
  });

  await logActivity(task._id, req.user._id, "task_created", `${req.user.name} created this task.`);
  await notifyUser(assignee, `${req.user.name} assigned you a new task: "${title}".`, "assign", { relatedTask: task._id, relatedProject: project });
  await syncProjectCounters(project);

  const populated = await task.populate(populateOpts);
  sendSuccess(res, populated, 201);
});

// @route PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, "Task not found");

  const editable = ["title", "description", "priority", "status", "assignee", "dueDate", "tags"];
  const changeLabels = {
    title: (v) => `renamed the task to "${v}"`,
    description: () => "updated the description",
    priority: (v) => `changed priority to ${v}`,
    status: (v) => `changed status to ${v}`,
    assignee: () => "reassigned the task",
    dueDate: (v) => `changed the due date to ${new Date(v).toLocaleDateString()}`,
    tags: () => "updated the tags",
  };
  const changes = [];
  editable.forEach((field) => {
    if (req.body[field] !== undefined && String(req.body[field]) !== String(task[field])) {
      changes.push(changeLabels[field](req.body[field]));
      task[field] = req.body[field];
    }
  });

  await task.save();
  if (changes.length) {
    await logActivity(task._id, req.user._id, "task_updated", `${req.user.name}: ${changes.join(", ")}.`);
  }
  await syncProjectCounters(task.project);

  const populated = await task.populate(populateOpts);
  sendSuccess(res, populated);
});

// @route DELETE /api/tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, "Task not found");

  const projectId = task.project;
  await Promise.all([
    Comment.deleteMany({ task: task._id }),
    Activity.deleteMany({ task: task._id }),
    task.deleteOne(),
  ]);
  await syncProjectCounters(projectId);

  sendSuccess(res, { id: req.params.id, deleted: true });
});

// @route PATCH /api/tasks/:id/status
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Task.STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${Task.STATUSES.join(", ")}`);
  }

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, "Task not found");

  const previousStatus = task.status;
  task.status = status;
  await task.save();

  await logActivity(task._id, req.user._id, "status_changed", `${req.user.name} moved the task to ${status}.`);
  if (status === "Completed" && previousStatus !== "Completed") {
    await logActivity(task._id, req.user._id, "task_completed", `${req.user.name} marked this task as completed.`);
    await notifyUser(task.assignee, `"${task.title}" was marked as completed.`, "done", { relatedTask: task._id, relatedProject: task.project });
  }
  await syncProjectCounters(task.project);

  const populated = await task.populate(populateOpts);
  sendSuccess(res, populated);
});

// @route PATCH /api/tasks/:id/checklist/:checklistId
const updateChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, "Task not found");

  const item = task.checklist.id(req.params.checklistId);
  if (!item) throw new ApiError(404, "Checklist item not found");

  item.done = typeof req.body.done === "boolean" ? req.body.done : !item.done;
  await task.save();

  await logActivity(
    task._id,
    req.user._id,
    item.done ? "checklist_item_completed" : "checklist_item_reopened",
    `${req.user.name} ${item.done ? "checked off" : "reopened"} "${item.label}".`
  );

  const populated = await task.populate(populateOpts);
  sendSuccess(res, populated);
});

module.exports = {
  getTasks, getTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, updateChecklistItem,
};
