const express = require("express");
const {
  getProjects, getProjectById, createProject, updateProject, deleteProject,
} = require("../controllers/projectController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.route("/").get(getProjects).post(createProject);
router.route("/:id").get(getProjectById).put(updateProject).delete(deleteProject);

module.exports = router;
