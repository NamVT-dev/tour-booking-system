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

//  Cập nhật thông tin cá nhân (customer) hoặc công ty (partner)
router.patch(
  "/update/profile",
  authController.protect,
  authController.updateUser
);

module.exports = router;
