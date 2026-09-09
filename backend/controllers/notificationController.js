const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const Notification = require("../models/Notification");

// @route GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  const unreadCount = notifications.filter((n) => !n.read).length;
  sendSuccess(res, notifications, 200, { unreadCount });
});

// @route PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (String(notification.user) !== String(req.user._id)) {
    throw new ApiError(403, "This notification does not belong to you");
  }
  notification.read = true;
  await notification.save();
  sendSuccess(res, notification);
});

// @route PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  sendSuccess(res, { updated: true });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
