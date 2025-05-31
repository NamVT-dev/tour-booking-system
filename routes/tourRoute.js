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
router.get("/", authController.protect, tourController.getAllTours);
router.patch(
  "/:id",
  authController.protect,
  authController.restrictTo("partner"),
  tourController.updateTour
);
module.exports = router;
