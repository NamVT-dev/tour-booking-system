const express = require("express");
const tourController = require("../controllers/tourController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/partner", authController.protect, tourController.getPartnerTours);
router.get("/:id", authController.protect, tourController.getTourById);

router.get("/", tourController.getAllTours);
router.post("/:id/remaining-slots", tourController.getRemainingSlots);

router.get("/detail/:slug", tourController.getTourBySlug);

router.use(authController.protect);
router.use(authController.restrictTo("partner"));

router.post(
  "/create",
  tourController.uploadTourImages,
  tourController.resizeTourImages,
  tourController.createTour
);
router.post(
  "/partner/update-status/:tourId",
  authController.protect,
  tourController.updateTourStatusByPartner
);
router.patch(
  "/:id",
  tourController.uploadTourImages,
  tourController.resizeTourImages,
  tourController.updateTour
);
router.delete("/:id", tourController.deleteTour);

module.exports = router;
