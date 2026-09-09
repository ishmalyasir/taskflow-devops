const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

// @route GET /api/tasks/:taskId/comments
const getCommentsForTask = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ task: req.params.taskId })
    .populate("user", "name jobTitle avatarColor")
    .sort({ createdAt: 1 });
  sendSuccess(res, comments);
});

// @route POST /api/tasks/:taskId/comments
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) throw new ApiError(400, "Comment text is required");

  const task = await Task.findById(req.params.taskId);
  if (!task) throw new ApiError(404, "Task not found");

  const comment = await Comment.create({ task: task._id, user: req.user._id, text });
  await Activity.create({ task: task._id, user: req.user._id, type: "comment_added", text: `${req.user.name} added a comment.` });

  if (String(task.assignee) !== String(req.user._id)) {
    await Notification.create({
      user: task.assignee,
      text: `${req.user.name} commented on "${task.title}".`,
      kind: "comment",
      relatedTask: task._id,
      relatedProject: task.project,
    });
  }

  const populated = await comment.populate("user", "name jobTitle avatarColor");
  sendSuccess(res, populated, 201);
});

// @route DELETE /api/comments/:id
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (String(comment.user) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await comment.deleteOne();
  sendSuccess(res, { id: req.params.id, deleted: true });
});

module.exports = { getCommentsForTask, addComment, deleteComment };
