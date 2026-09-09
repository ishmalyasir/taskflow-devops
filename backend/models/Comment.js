const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: [true, "Comment text is required"], trim: true, maxlength: 2000 },
  },
  { timestamps: true } // createdAt is the frontend's "time"
);

module.exports = mongoose.model("Comment", commentSchema);
