const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

// partner overview in specific month
exports.getPartnerOverview = catchAsync(async (req, res, next) => {
  const partnerId = req.user.id;

  // Lấy month và year từ query params, nếu không có thì lấy tháng hiện tại
  const queryMonth = parseInt(req.query.month); // (1-12)
  const queryYear = parseInt(req.query.year);

  const now = new Date();
  const month =
    !isNaN(queryMonth) && queryMonth >= 1 && queryMonth <= 12
      ? queryMonth - 1
      : now.getMonth(); // JS month: 0-11
  const year =
    !isNaN(queryYear) && queryYear >= 1970 ? queryYear : now.getFullYear();

  // Tính ngày đầu và cuối của tháng
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // 1. Lấy tất cả tour của partner
  const partnerTours = await Tour.find({ partner: partnerId });
  if (!partnerTours || partnerTours.length === 0) {
    return next(new AppError("Không tìm thấy tour nào cho đối tác này.", 404));
  }

  const tourIds = partnerTours.map((t) => t._id);

  // 2. Lấy các booking đã thanh toán trong khoảng thời gian
  const bookings = await Booking.find({
    tour: { $in: tourIds },
    paid: true,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  // 3. Tổng doanh thu
  const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);

  // 4. Số booking
  const totalBookings = bookings.length;

  // 5. Tổng số người tham gia
  const totalParticipants = bookings.reduce(
    (sum, b) => sum + b.numberOfPeople,
    0
  );

  // 6. Số tour active (không giới hạn theo tháng)
  const activeToursCount = partnerTours.filter(
    (t) => t.status === "active"
  ).length;

  // 7. Doanh thu trung bình / tour
  const averageRevenuePerTour =
    partnerTours.length > 0
      ? Math.round(totalRevenue / partnerTours.length)
      : 0;

  return res.status(200).json({
    status: "success",
    data: {
      totalRevenue,
      totalBookings,
      totalParticipants,
      activeToursCount,
      averageRevenuePerTour,
      from: startDate,
      to: endDate,
      month: month + 1,
      year,
    },
  });
});

// partner analytics
exports.getPartnerAnalytics = catchAsync(async (req, res, next) => {
  const partnerId = req.user.id;

  const queryYear = parseInt(req.query.year);
  const now = new Date();
  const year =
    !isNaN(queryYear) && queryYear >= 1970 ? queryYear : now.getFullYear();

  // Thời gian từ đầu năm đến cuối năm
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  // Lấy các tour của partner
  const partnerTours = await Tour.find({ partner: partnerId });
  if (!partnerTours || partnerTours.length === 0) {
    return next(new AppError("Không tìm thấy tour nào cho đối tác này.", 404));
  }

  const tourIds = partnerTours.map((t) => t._id);

  // Doanh thu theo tháng
  const bookings = await Booking.aggregate([
    {
      $match: {
        tour: { $in: tourIds },
        paid: true,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" }, // Nhóm theo tháng
        totalRevenue: { $sum: "$price" },
      },
    },
    {
      $project: {
        month: "$_id",
        totalRevenue: 1,
        _id: 0,
      },
    },
  ]);

  // Tạo dữ liệu đầy đủ cho 12 tháng
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const monthData = bookings.find((b) => b.month === i + 1);
    return {
      month: i + 1,
      totalRevenue: monthData ? monthData.totalRevenue : 0,
    };
  });

  // Thống kê trạng thái tour
  const tourStatusStats = {
    active: 0,
    inactive: 0,
    pending: 0,
  };
  partnerTours.forEach((tour) => {
    if (tourStatusStats[tour.status] !== undefined) {
      tourStatusStats[tour.status]++;
    }
  });

  return res.status(200).json({
    status: "success",
    data: {
      year,
      monthlyRevenue,
      tourStatusStats,
    },
  });
});

// top 5 tours by revenue
exports.getTopRevenueTours = catchAsync(async (req, res, next) => {
  const partnerId = req.user.id;
  const { month, year } = req.query;

  // Parse and validate month/year
  const m = parseInt(month);
  const y = parseInt(year);

  let timeFilter = {};
  if (!isNaN(m) && !isNaN(y)) {
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);
    timeFilter = { createdAt: { $gte: startDate, $lte: endDate } };
  }

  // Lấy danh sách tour của partner
  const tours = await Tour.find({ partner: partnerId });
  if (!tours || tours.length === 0) {
    return next(new AppError("Không tìm thấy tour nào cho đối tác này.", 404));
  }
  const tourIds = tours.map((t) => t._id);

  // Tạo map lấy tên và ngày khởi hành gần nhất
  const tourMap = {};
  tours.forEach((tour) => {
    const nextStartDate =
      tour.startDates.filter((d) => d >= new Date()).sort((a, b) => a - b)[0] ||
      null;

    tourMap[tour._id.toString()] = {
      name: tour.name,
      nextStartDate,
    };
  });

  // Aggregate booking để tính doanh thu
  const stats = await Booking.aggregate([
    {
      $match: {
        tour: { $in: tourIds },
        paid: true,
        ...timeFilter,
      },
    },
    {
      $group: {
        _id: "$tour",
        totalRevenue: { $sum: "$price" },
        totalBookings: { $sum: 1 },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  const topTours = stats.map((item) => {
    const info = tourMap[item._id.toString()] || {};
    return {
      tourId: item._id,
      name: info.name || "Chưa rõ tên",
      totalRevenue: item.totalRevenue,
      totalBookings: item.totalBookings,
      nextStartDate: info.nextStartDate,
    };
  });

  res.status(200).json({
    status: "success",
    results: topTours.length,
    topTours,
  });
});

// Find all booking details
exports.getBookingDetails = catchAsync(async (req, res, next) => {
  const partnerId = req.user.id;
  const {
    tour, // tourId cụ thể
    month,
    year,
    paid,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const skip = (page - 1) * limit;

  // Lấy danh sách tour thuộc partner
  const tours = await Tour.find({ partner: partnerId });
  if (!tours || tours.length === 0) {
    return next(new AppError("Không tìm thấy tour nào cho đối tác này.", 404));
  }
  const tourMap = {};
  tours.forEach((t) => (tourMap[t._id.toString()] = t));
  const tourIds = Object.keys(tourMap);

  // Filter chính
  const filter = {
    tour: { $in: tourIds },
  };

  // Lọc theo tour cụ thể
  if (tour && tourIds.includes(tour)) {
    filter.tour = tour;
  }

  // Lọc theo tháng/năm
  if (month && year) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    filter.startDate = { $gte: from, $lte: to };
  }

  // Lọc theo trạng thái thanh toán
  if (paid !== undefined) {
    filter.paid = paid === "true";
  }

  // Populate tour & user
  let query = Booking.find(filter)
    .populate({
      path: "tour",
      select: "name",
    })
    .populate({
      path: "user",
      select: "name email",
    });

  // Tổng số bản ghi (cho phân trang)
  const total = await Booking.countDocuments(filter);

  // Lấy dữ liệu có phân trang
  let bookings = await query
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Tìm kiếm theo tên tour hoặc người dùng
  if (search) {
    const regex = new RegExp(search, "i");
    bookings = bookings.filter(
      (b) =>
        regex.test(b.tour?.name || "") ||
        regex.test(b.user?.name || "") ||
        regex.test(b.user?.email || "")
    );
  }

  // Format kết quả
  const formatted = bookings.map((b) => ({
    bookingId: b._id,
    tourName: b.tour?.name || "Không rõ",
    userName: b.user?.name || "Không rõ",
    userEmail: b.user?.email || "",
    startDate: b.startDate,
    numberOfPeople: b.numberOfPeople,
    totalPrice: b.price,
    paid: b.paid,
  }));

  res.status(200).json({
    status: "success",
    total,
    page: +page,
    limit: +limit,
    data: formatted,
  });
});
