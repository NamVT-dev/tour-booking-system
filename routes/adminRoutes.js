const express = require("express");
const {
    getAllUserForAdmin,
    createPartnerAccount,
    approveTour,
    getPendingTours
    } = require("./../controllers/adminController");


const router = express.Router();

router.get("/users", getAllUserForAdmin);
router.post("/createPartner",createPartnerAccount);
router.get("/pendingTour",getPendingTours);
router.patch("/pendingTour/:tourId/approve", approveTour);

module.exports = router;