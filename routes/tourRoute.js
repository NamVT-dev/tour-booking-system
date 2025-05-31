const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");
const authController = require("../controllers/authController");
router.post(
  "/create",
  authController.protect,
  authController.restrictTo("partner"),
  tourController.createTour
);
module.exports = router;
