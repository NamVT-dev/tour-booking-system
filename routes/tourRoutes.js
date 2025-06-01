const express = require("express");
const tourController = require("../controllers/tourController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", tourController.getAllTours);
router.get("/:slug", tourController.getTourBySlug);

router.use(authController.protect);

router.get("/partner", authController.protect, tourController.getPartnerTours);
router.get("/:id", authController.protect, tourController.getTourById);

router.use(authController.restrictTo("partner"));

router.post("/create", tourController.createTour);
router.patch("/:id", tourController.updateTour);
router.delete("/:id", tourController.deleteTour);

module.exports = router;
