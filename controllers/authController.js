const { promisify } = require("node:util");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "Lax",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  console.log("Đã tạo user");
  const confirmPin = newUser.createConfirmPin();

  await newUser.save({ validateBeforeSave: false });
  console.log(" Gửi email xác nhận");
  try {
    await new Email(newUser, { pin: confirmPin }).sendConfirmEmail();
    console.log("Gửi email xong");
    createSendToken(newUser, 201, req, res);
    /*eslint-disable-next-line*/
  } catch (err) {
    newUser.confirmPin = undefined;
    await newUser.save({ validateBeforeSave: false });
    return next(new AppError("Có lỗi khi gửi email. Hãy thử lại sau!"), 500);
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Hãy nhập tài khoản và mật khẩu!", 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Tài khoản hoặc mật khẩu không đúng", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.bypassInactiveProtect = (req, res, next) => {
  req.allowedRoute = true;
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("Xin hãy đăng nhập để thực hiện hành động.", 401));
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("Không tìm thấy người dùng.", 401));
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "Người dùng mới đổi mật khẩu gần đây! Hãy đăng nhập lại.",
        401
      )
    );
  }

  if (!currentUser.active && !req.allowedRoute) {
    return next(new AppError("Tài khoản chưa được xác nhận", 401));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("Bạn không có quyền thực hiện hành động này", 403)
      );
    }

    next();
  };
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Mật khẩu hiện tại không đúng.", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, req, res);
});

exports.getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).lean();

  if (!user) {
    return res.status(404).json({
      status: "fail",
      message: "Không tìm thấy người dùng",
    });
  }

  if (!user.companyLocation) {
    user.companyLocation = { address: "" };
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.updateUser = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {
    name,
    email,
    photo,
    companyName,
    companyDescription,
    companyLocation,
    contactEmail,
    contactPhone,
    website,
    logo,
  } = req.body;

  let updateFields = {};

  if (req.user.role === "customer") {
    updateFields = { name, email, photo };
  } else if (req.user.role === "partner") {
    updateFields = {
      companyName,
      companyDescription,
      companyLocation,
      contactEmail,
      contactPhone,
      website,
      logo,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return res
      .status(404)
      .json({ status: "fail", message: "Không tìm thấy user!" });
  }

  res.status(200).json({ status: "success", data: { user: updatedUser } });
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  const { pin } = req.params;

  const user = await User.findById(req.user.id);

  if (!user.confirmEmail(pin))
    return next(new AppError("Mã PIN không hợp lệ!", 400));

  user.save({ validateBeforeSave: false });

  const url = `${process.env.FRONT_END_URI}/profile`;
  await new Email(user, { url }).sendWelcome();

  res.status(200).json({
    status: "success",
    data: {
      data: user,
    },
  });
});

exports.resendConfirmEmail = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (user.active)
    return next(new AppError("Tài khoản đã được xác nhận!", 400));

  const confirmPin = user.createConfirmPin();

  await user.save({ validateBeforeSave: false });

  try {
    await new Email(user, { pin: confirmPin }).sendConfirmEmail();
    res.status(200).json({
      status: "success",
      message: "Mail xác nhận đã gửi lại thành công!",
    });
    /*eslint-disable-next-line*/
  } catch (err) {
    user.confirmPin = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Có lỗi khi gửi email. Hãy thử lại sau!"), 500);
  }
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${process.env.FRONT_END_URI}/reset-password?token=${resetToken}&email=${user.email}`;
    await new Email(user, { url: resetURL }).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Mail xác nhận đã được gửi tới email của bạn!",
    });
    /*eslint-disable-next-line*/
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("Có lỗi xảy ra khi gửi mail!"), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    email: req.body.email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn!", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res);
});
