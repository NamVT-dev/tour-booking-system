const express = require("express");
const bookingController = require("../controllers/bookingController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/:tourId/start-dates", bookingController.getTourStartDates);

router.use(authController.protect);

router.post("/", bookingController.createBooking);
router.get("/my", bookingController.getMyBookings);
router.post("/checkout-session", bookingController.getCheckoutSession);
router.get(
  "/partner",
  authController.protect,
  authController.restrictTo("partner"),
  bookingController.getPartnerBookings
);
module.exports = router;
