const catchAsync = require("../utils/catchAsync");
const multer = require("multer");
const sharp = require("sharp");

const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const { uploadToCloudinary } = require("../config/cloudinary");
const Booking = require("../models/bookingModel");
const { Types } = require("mongoose");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(
      new AppError("Không phải ảnh! Xin hãy đăng đúng định dạng ảnh.", 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files?.imageCover || !req.files?.images) return next();
  // 1) Cover image
  const coverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  const buffer = await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const uploadCover = await uploadToCloudinary("tours", buffer, coverFilename);
  req.body.imageCover = uploadCover.secure_url;
  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      const buffer = await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer(); // Chuyển thành buffer

      const uploadedImage = await uploadToCloudinary("tours", buffer, filename);
      req.body.images.push(uploadedImage.secure_url); // Lưu URL ảnh
    })
  );

  next();
});

//POST
exports.createTour = catchAsync(async (req, res, next) => {
  if (req.user.role !== "partner") {
    return next(new AppError("Chỉ partner mới được tạo tour", 403));
  }

  const tourData = {
    ...req.body,
    partner: req.user._id,
    status: "pending",
  };

  const newTour = await Tour.create(tourData);
  res.status(201).json({
    status: "success",
    data: {
      tour: newTour,
    },
  });
});

exports.getPartnerTours = catchAsync(async (req, res) => {
  const partnerId = req.user.id;

  let query = Tour.find({ partner: partnerId });

  query = query.sort("-createdAt");

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const tours = await query;

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: { tours },
  });
});
//GET
exports.getTourById = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
  }
  res.status(200).json({ status: "success", data: { tour } });
});

//Patch
exports.updateTour = catchAsync(async (req, res, next) => {
  console.log(req.body.description);
  const tourId = req.params.id;
  const tour = await Tour.findById(tourId);

  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
  }
  //Check role moi duoc update
  if (req.user.role === "partner") {
    if (tour.partner.toString() !== req.user._id.toString()) {
      return next(
        new AppError("Bạn chỉ được quyền chỉnh sửa tour cá nhân", 403)
      );
    }
    if (req.body.status === "active") {
      return next(
        new AppError("Bạn không có quyền sửa trạng thái tour sang active", 403)
      );
    }
    delete req.body.status;
  } else if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "fail",
      message: "You are not allowed to update this tour",
    });
  }

  Object.keys(req.body).forEach((key) => {
    tour[key] = req.body[key];
  });

  const updatedTour = await tour.save();

  res.status(200).json({
    status: "success",
    data: {
      tour: updatedTour,
    },
  });
});

//Delete
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
  }

  if (
    req.user.role === "partner" &&
    tour.partner.toString() !== req.user._id.toString()
  ) {
    return next(new AppError("Bạn chỉ có thể xóa tour của mình!", 403));
  }

  await Tour.findByIdAndDelete(req.params.id);

  res.status(200).json({ status: "success", message: "Tour đã bị xóa!" });
});

exports.getAllTours = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 6,
    sort = "-createdAt",
    search = "",
    minPrice,
    maxPrice,
  } = req.query;

  const skip = (page - 1) * limit;

  // Tìm kiếm chung
  const searchConditions = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { summary: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // Lọc theo giá
  const priceConditions = {};
  if (minPrice) priceConditions.$gte = Number(minPrice);
  if (maxPrice) priceConditions.$lte = Number(maxPrice);

  // Lọc theo ratingsAverage
  let ratingsConditions = {};
  if (
    req.query.ratingsAverage &&
    req.query.ratingsAverage !== "Tất cả đánh giá"
  ) {
    const rating = Number(req.query.ratingsAverage);
    if (rating === 5) {
      ratingsConditions = { $eq: 5 };
    } else if (rating === 4) {
      ratingsConditions = { $gte: 4 };
    } else if (rating === 3) {
      ratingsConditions = { $gte: 3 };
    }
  }

  // Tổng hợp điều kiện
  const filterQuery = {
    ...searchConditions,
    status: "active",
  };

  if (Object.keys(priceConditions).length > 0) {
    filterQuery.price = priceConditions;
  }
  if (Object.keys(ratingsConditions).length > 0) {
    filterQuery.ratingsAverage = ratingsConditions;
  }

  // Truy vấn database
  const tours = await Tour.find(filterQuery)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Tour.countDocuments(filterQuery);

  res.status(200).json({
    status: "success",
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    results: tours.length,
    data: {
      tours,
    },
  });
});

// Get tour by slug
exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const tour = await Tour.findOne({ slug, status: "active" });

  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
  }

  const tourResponse = {
    id: tour._id,
    name: tour.name,
    duration: tour.duration,
    maxGroupSize: tour.maxGroupSize,
    rating: tour.ratingsAverage,
    reviews: tour.ratingsQuantity,
    price: tour.price,
    summary: tour.summary,
    description: tour.description,
    imageCover: tour.imageCover,
    images: tour.images,
    startDates: tour.startDates,
    locations: tour.locations.map((loc) => ({
      type: loc.type,
      coordinates: loc.coordinates,
      address: loc.address,
      description: loc.description,
      day: loc.day,
    })),
  };

  res.status(200).json({
    status: 200,
    message: "Lấy thông tin tour thành công",
    data: {
      tour: tourResponse,
    },
  });
});

// Update tour status by partner if it is active
exports.updateTourStatusByPartner = catchAsync(async (req, res, next) => {
  const tourId = req.params.tourId;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError("Không tìm thấy tour với ID này", 404));
  }

  // Check if user is partner and owns the tour
  if (tour.partner.toString() !== req.user._id.toString()) {
    return next(new AppError("Bạn không có quyền cập nhật tour này", 403));
  }

  // Check tour status
  if (tour.status === "active") {
    tour.status = "inactive";
    await tour.save();
    res.status(200).json({
      status: "success",
      message: "Tour đã được cập nhật thành không hoạt động",
    });
  } else {
    return next(new AppError("Tour đã ở trạng thái không hoạt động", 400));
  }
});

exports.getRemainingSlots = catchAsync(async (req, res, next) => {
  const tourId = req.params.id;
  const { startDate } = req.body;

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Không tìm thấy tour", 404));
  const inputDate = new Date(startDate);

  const targetDateString = inputDate.toISOString().split("T")[0];

  const result = await Booking.aggregate([
    {
      $match: {
        tour: new Types.ObjectId(tourId),
      },
    },
    {
      $addFields: {
        startDateString: {
          $dateToString: { format: "%Y-%m-%d", date: "$startDate" },
        },
      },
    },
    {
      $match: {
        startDateString: targetDateString,
      },
    },
    {
      $group: {
        _id: null,
        totalPeople: { $sum: "$numberOfPeople" },
      },
    },
  ]);

  const takenSlots = result[0]?.totalPeople ?? 0;

  res.status(200).json({
    status: "success",
    data: {
      remainingSlots: tour.maxGroupSize - takenSlots,
    },
  });
});
