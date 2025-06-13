const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModel");
const catchAsync = require("../utils/catchAsync");

exports.getPartnerBookings = catchAsync(async (req, res) => {
  const partnerId = req.user._id;

  // Tìm tour thuộc về partner
  const partnerTours = await Tour.find({ partner: partnerId }).select("_id");

  if (!partnerTours.length) {
    return res.status(404).json({
      status: "fail",
      message: "Bạn chưa có tour nào được đặt!",
    });
  }

  const tourIds = partnerTours.map((tour) => tour._id);

  // Lấy danh sách booking có tour thuộc về partner
  const bookings = await Booking.find({ tour: { $in: tourIds } })
    .populate("customer", "name email")
    .populate("tour", "name price duration");

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});
