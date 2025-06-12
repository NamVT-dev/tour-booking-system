const express = require("express");
const tourController = require("../controllers/tourController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/partner", authController.protect, tourController.getPartnerTours);
router.get("/:id", authController.protect, tourController.getTourById);

router.get("/", tourController.getAllTours);

router.get("/:slug", tourController.getTourBySlug);

router.use(authController.protect);
router.use(authController.restrictTo("partner"));

router.post(
  "/create",
  tourController.uploadTourImages,
  tourController.resizeTourImages,
  tourController.createTour
);
router.patch(
  "/:id",
  tourController.uploadTourImages,
  tourController.resizeTourImages,
  tourController.updateTour
);
router.delete("/:id", tourController.deleteTour);

module.exports = router;
