const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
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
    minlength: 8,
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
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  description: {
    type: String,
  },
});

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

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
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

const User = mongoose.model("User", userSchema);

module.exports = User;
