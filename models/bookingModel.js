const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: true,
  },
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  price: Number,
  bookedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
