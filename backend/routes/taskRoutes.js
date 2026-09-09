const express = require("express");
const {
  getTasks, getTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, updateChecklistItem,
} = require("../controllers/taskController");
const { getCommentsForTask, addComment } = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.route("/").get(getTasks).post(createTask);
router.route("/:id").get(getTaskById).put(updateTask).delete(deleteTask);
router.patch("/:id/status", updateTaskStatus);
router.patch("/:id/checklist/:checklistId", updateChecklistItem);
router.route("/:taskId/comments").get(getCommentsForTask).post(addComment);

module.exports = router;
