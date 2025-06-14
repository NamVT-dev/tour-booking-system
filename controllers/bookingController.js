const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createBooking = catchAsync(async (req, res, next) => {
  const { tourId, startDate, numberOfPeople } = req.body;

  if (!tourId || !startDate || !numberOfPeople) {
    return next(new AppError("Vui lòng cung cấp đầy đủ thông tin.", 400));
  }

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Không tìm thấy tour.", 404));

  const isValidDate = tour.startDates.some(
    (date) => new Date(date).toISOString() === new Date(startDate).toISOString()
  );
  if (!isValidDate) {
    return next(new AppError("Ngày khởi hành không hợp lệ.", 400));
  }

  const totalPrice = tour.price * numberOfPeople;

  const booking = await Booking.create({
    tour: tour._id,
    user: req.user._id,
    startDate,
    numberOfPeople,
    createdAt: new Date(),
    price: totalPrice,
    paid: false,
    status: "pending",
  });

  res.status(201).json({
    status: "success",
    data: booking,
  });
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate("tour", "name imageCover startDates price")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: bookings,
  });
});
exports.getTourStartDates = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId).select("startDates");

  if (!tour) {
    return next(new AppError("Không tìm thấy tour.", 404));
  }

  res.status(200).json({
    status: "success",
    data: tour.startDates,
  });
});
