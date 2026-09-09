const express = require("express");
const { deleteComment } = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.delete("/:id", deleteComment);

module.exports = router;
