const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Project name is required"], trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["Planning", "In Progress", "On Hold", "Completed"],
      default: "Planning",
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    // Denormalized counters kept in sync by Task hooks/controllers so the
    // frontend can read them directly without an aggregation on every request.
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    dueDate: { type: Date },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    color: {
      type: String,
      enum: ["indigo", "violet", "sky", "emerald", "amber", "rose"],
      default: "indigo",
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Project", projectSchema);
