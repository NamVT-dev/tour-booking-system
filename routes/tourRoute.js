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
router.get("/partner", authController.protect, tourController.getPartnerTours);
router.get("/:id", authController.protect, tourController.getTourById);
router.patch(
  "/:id",
  authController.protect,
  authController.restrictTo("partner"),
  tourController.updateTour
);
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("partner"),
  tourController.deleteTour
);
module.exports = router;
