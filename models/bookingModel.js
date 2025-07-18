const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Booking phải liên kết với một tour."],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Booking phải liên kết với một người dùng."],
    },
    startDate: {
      type: Date,
      required: [true, "Phải có ngày bắt đầu tour."],
    },
    numberOfPeople: {
      type: Number,
      required: [true, "Phải có số người tham gia."],
      min: [1, "Ít nhất 1 người tham gia."],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    price: {
      type: Number,
      required: [true, "Giá booking là bắt buộc."],
      min: [0, "Giá phải lớn hơn hoặc bằng 0."],
    },
    paid: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
  }
);

// Optional: populate user & tour when finding bookings
bookingSchema.pre(/^find/, function (next) {
  this.populate("tour").populate("user");
  next();
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
