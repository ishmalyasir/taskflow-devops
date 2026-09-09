const express = require("express");
const { getTeam } = require("../controllers/teamController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getTeam);

module.exports = router;
