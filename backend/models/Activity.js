const mongoose = require("mongoose");

const ACTIVITY_TYPES = [
  "task_created",
  "task_assigned",
  "priority_changed",
  "status_changed",
  "comment_added",
  "checklist_item_completed",
  "checklist_item_reopened",
  "task_completed",
  "task_updated",
];

const activitySchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    text: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true } // createdAt is the frontend's "time"
);

activitySchema.statics.TYPES = ACTIVITY_TYPES;

module.exports = mongoose.model("Activity", activitySchema);
