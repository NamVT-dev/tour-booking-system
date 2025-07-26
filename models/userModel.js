const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const { generateRandomPin } = require("../utils/passwordUtils");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Xin hãy cung cấp tên của bạn"],
    },
    email: {
      type: String,
      required: [true, "Xin hãy cung cấp email của bạn"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Email không hợp lệ"],
    },
    photo: {
      type: String,
      default:
        "https://res.cloudinary.com/dmskqrjiu/image/upload/v1742210170/users/default.jpg.jpg",
    },
    role: {
      type: String,
      enum: ["customer", "admin", "partner"],
      default: "customer",
    },
    password: {
      type: String,
      required: [true, "Xin hãy đặt mật khẩu"],
      minlength: [8, "Mật khẩu phải chứa ít nhất 8 ký tự"],
      validate: [
        validator.isStrongPassword,
        "Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ký tự đặc biệt, chữ in hoa và số",
      ],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Xin hãy xác nhận mật khẩu"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Mật khẩu không trùng khớp",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    confirmPin: String,
    confirmPinExpires: Date,
    active: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createConfirmPin = function () {
  const confirmPin = generateRandomPin(6);
  this.confirmPin = crypto
    .createHash("sha256")
    .update(confirmPin)
    .digest("hex");

  this.confirmPinExpires = Date.now() + 10 * 60 * 1000;

  return confirmPin;
};

userSchema.methods.confirmEmail = function (pin) {
  const hashedPin = crypto.createHash("sha256").update(pin).digest("hex");

  if (hashedPin !== this.confirmPin || Date.now() > this.confirmPinExpires)
    return false;

  this.active = true;
  this.confirmPin = undefined;
  this.confirmPinExpires = undefined;

  return true;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
