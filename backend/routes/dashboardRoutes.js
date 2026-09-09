const express = require("express");
const {
  getStats, getProductivity, getPriorityBreakdown, getProjectProgress,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/stats", getStats);
router.get("/productivity", getProductivity);
router.get("/priority-breakdown", getPriorityBreakdown);
router.get("/project-progress", getProjectProgress);

module.exports = router;
