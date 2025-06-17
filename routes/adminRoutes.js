const express = require("express");
const {
  getAllUserForAdmin,
  createPartnerAccount,
  approveTour,
  getPendingTours,
  banUser,
} = require("./../controllers/adminController");
const {
  getNewUsersAndPartners
} = require("./../controllers/dashboardAdminController");

const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect, authController.restrictTo("admin"));

router.get("/users", getAllUserForAdmin);
router.post("/createPartner", createPartnerAccount);
router.get("/pendingTour", getPendingTours);
router.patch("/pendingTour/:tourId/approve", approveTour);
router.get("/stats/view-new-user", getNewUsersAndPartners);
router.patch("/users/:userId/ban", banUser);

module.exports = router;
