const express = require("express");
const {
  getAllUserForAdmin,
  createPartnerAccount,
  approveTour,
  getPendingTours,
} = require("./../controllers/adminController");

const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect, authController.restrictTo("admin"));

router.get("/users", getAllUserForAdmin);
router.post("/createPartner", createPartnerAccount);
router.get("/pendingTour", getPendingTours);
router.patch("/pendingTour/:tourId/approve", approveTour);

module.exports = router;
