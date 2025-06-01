const express = require("express");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

router.get("/profile", authController.protect, authController.getProfile);

module.exports = router;
