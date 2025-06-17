const express = require("express");
const {
  getPartnerOverview,
  getPartnerAnalytics,
  getTopRevenueTours,
  getBookingDetails,
} = require("../controllers/reportController");
const authController = require("../controllers/authController");

const router = express.Router();
router.use(authController.protect, authController.restrictTo("partner"));

router.get("/overview", getPartnerOverview);
router.get("/analytics", getPartnerAnalytics);
router.get("/top-revenue-tours", getTopRevenueTours);
router.get("/booking-details", getBookingDetails);

module.exports = router;
