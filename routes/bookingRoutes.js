const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");

router.get(
  "/partner",
  authController.protect,
  authController.restrictTo("partner"),
  bookingController.getPartnerBookings
);

module.exports = router;
