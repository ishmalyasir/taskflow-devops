const mongoose = require("mongoose");

const NOTIFICATION_KINDS = ["done", "due", "comment", "progress", "assign", "alert", "status"];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, maxlength: 300 },
    kind: { type: String, enum: NOTIFICATION_KINDS, default: "status" },
    read: { type: Boolean, default: false },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true } // createdAt is the frontend's "time"
);

notificationSchema.statics.KINDS = NOTIFICATION_KINDS;

module.exports = mongoose.model("Notification", notificationSchema);
