const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  review: String,
  rating: { type: Number, min: 1, max: 5 },
  createdAt: Date,
  tour: { type: mongoose.Schema.ObjectId, ref: "Tour" },
  user: { type: mongoose.Schema.ObjectId, ref: "User" },
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
