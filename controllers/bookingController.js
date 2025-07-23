const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getCheckoutSession = catchAsync(async (req, res) => {
  const tour = await Tour.findById(req.body.tourId);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${process.env.FRONT_END_URI}/?success=true`,
    cancel_url: `${process.env.FRONT_END_URI}/?success=false`,
    customer_email: req.user.email,
    client_reference_id: req.body.tourId,
    mode: "payment",
    metadata: {
      startDate: req.body.startDate,
      numberOfPeople: req.body.numberOfPeople.toString(),
    },
    line_items: [
      {
        price_data: {
          currency: "vnd",
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [tour.imageCover],
          },
          unit_amount: tour.price,
        },
        quantity: req.body.numberOfPeople,
      },
    ],
  });

  res.status(200).json({
    status: "success",
    session,
  });
});

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total;
  const startDate = session.metadata.startDate;
  const numberOfPeople = session.metadata.numberOfPeople;
  await Booking.create({
    tour,
    user,
    price,
    startDate,
    numberOfPeople,
    paid: true,
  });
};

exports.webhookCheckout = (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed")
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};
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
exports.getPartnerBookings = catchAsync(async (req, res) => {
  const partnerId = req.user._id;
 console.log("🔍 Partner ID:", partnerId);
  // Tìm tour thuộc về partner
  const partnerTours = await Tour.find({ partner: partnerId }).select("_id");
console.log("📋 Danh sách tour thuộc partner:", partnerTours);
  if (!partnerTours.length) {
    console.log("⚠️ Partner chưa có tour nào.");
    return res.status(404).json({
      status: "fail",
      message: "Bạn chưa có tour nào được đặt!",
    });
  }
  const tourIds = partnerTours.map((tour) => tour._id);
  console.log("✅ Các tourId sẽ dùng để tìm booking:", tourIds);

  // Lấy danh sách booking có tour thuộc về partner
  const bookings = await Booking.find({ tour: { $in: tourIds } })
    .populate("user", "name email")
    .populate("tour", "name price duration");
    console.log("📦 Booking tìm được:", bookings);
  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});
