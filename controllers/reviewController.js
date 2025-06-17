// controllers/reviewController.js
const Review = require("../models/reviewModel");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createReview = catchAsync(async (req, res, next) => {
  const { tourId, review, rating } = req.body;

  if (!tourId || !review || !rating) {
    return next(new AppError("Vui lòng cung cấp đầy đủ thông tin.", 400));
  }

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Không tìm thấy tour.", 404));

  const newReview = await Review.create({
    tour: tourId,
    user: req.user._id,
    review,
    rating,
    createdAt: new Date(),
  });

  res.status(201).json({
    status: "success",
    data: newReview,
  });
});

exports.getTourReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ tour: req.params.tourId }).populate(
    "user",
    "name"
  );

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: reviews,
  });
});
