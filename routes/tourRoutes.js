const express = require("express");
const tourController = require("../controllers/tourController");

const router = express.Router();

router.get("/", tourController.getAllTours);
router.get("/:slug", tourController.getTourBySlug);

module.exports = router;
