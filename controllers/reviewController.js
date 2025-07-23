const Review = require("../models/reviewModel");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const mongoose = require("mongoose");

const updateTourRatings = async (tourId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        tour:
          typeof tourId === "string" ? mongoose.Types.ObjectId(tourId) : tourId,
      },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
exports.createReview = catchAsync(async (req, res, next) => {
  const { tourId, review, rating } = req.body;

  if (!tourId || !rating) {
    return next(new AppError("Vui lòng cung cấp đầy đủ thông tin.", 400));
  }

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Không tìm thấy tour.", 404));

  let newReview;
  try {
    newReview = await Review.create({
      tour: tourId,
      user: req.user._id,
      review,
      rating,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Lỗi khi tạo review:", err);
    return next(new AppError("Lỗi khi tạo review", 500));
  }

  try {
    await updateTourRatings(tourId);
  } catch (err) {
    console.error("Lỗi khi cập nhật ratings:", err);
  }

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
