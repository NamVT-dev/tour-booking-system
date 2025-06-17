const express = require("express");
const bookingController = require("../controllers/bookingController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/", authController.protect, bookingController.createBooking);
router.get("/my", authController.protect, bookingController.getMyBookings);
router.get("/:tourId/start-dates", bookingController.getTourStartDates);
module.exports = router;
