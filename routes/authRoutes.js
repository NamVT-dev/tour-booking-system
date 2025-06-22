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

router.get(
  "/profile",
  authController.bypassInactiveProtect,
  authController.protect,
  authController.getProfile
);

router.get(
  "/confirmEmail/:pin",
  authController.bypassInactiveProtect,
  authController.protect,
  authController.confirmEmail
);

router.get(
  "/resendConfirmEmail",
  authController.bypassInactiveProtect,
  authController.protect,
  authController.resendConfirmEmail
);

router.post("/forgotPassword", authController.forgotPassword);

router.post("/resetPassword", authController.resetPassword);

//  Cập nhật thông tin cá nhân (customer) hoặc công ty (partner)
router.patch(
  "/update/profile",
  authController.protect,
  authController.updateUser
);

module.exports = router;
