const Review = require("../models/reviewModel");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createReview = catchAsync(async (req, res, next) => {
  const { tourId, review, rating } = req.body;

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Không tìm thấy tour.", 404));

  const newReview = await Review.create({
    tour: tourId,
    user: req.user._id,
    review,
    rating,
  });

  res.status(201).json({
    status: "success",
    data: newReview,
  });
});

exports.getTourReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ tour: req.params.tourId });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: reviews,
  });
});
