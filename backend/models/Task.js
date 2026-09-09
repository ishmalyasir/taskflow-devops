const mongoose = require("mongoose");

const STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];

const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Task title is required"], trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    priority: { type: String, enum: PRIORITIES, default: "Medium" },
    status: { type: String, enum: STATUSES, default: "To Do" },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    checklist: [checklistItemSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true } // createdAt doubles as the frontend's "createdDate"
);

taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ dueDate: 1 });

taskSchema.statics.STATUSES = STATUSES;
taskSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model("Task", taskSchema);
