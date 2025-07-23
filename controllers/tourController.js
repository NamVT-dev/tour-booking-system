const catchAsync = require("../utils/catchAsync");
const multer = require("multer");
const sharp = require("sharp");

const Tour = require("../models/tourModel");
const Review = require("../models/reviewModel");
const AppError = require("../utils/appError");
const { uploadToCloudinary } = require("../config/cloudinary");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
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
  if (!req.files) return next();

  const timestamp = Date.now();

  // 1) Cover image
  if (req.files.imageCover && req.files.imageCover[0]) {
    const coverFilename = `tour-${timestamp}-cover.jpeg`;
    const buffer = await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    const uploadCover = await uploadToCloudinary(
      "tours",
      buffer,
      coverFilename
    );
    req.body.imageCover = uploadCover.secure_url;
  }

  // 2) Images
  req.body.images = [];
  if (req.files.images && req.files.images.length > 0) {
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${timestamp}-${i + 1}.jpeg`;

        const buffer = await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toBuffer();

        const uploadedImage = await uploadToCloudinary(
          "tours",
          buffer,
          filename
        );
        req.body.images.push(uploadedImage.secure_url);
      })
    );
  }

  next();
});

//POST
exports.createTour = catchAsync(async (req, res, next) => {
  if (req.user.role !== "partner") {
    return next(new AppError("Chỉ partner mới được tạo tour", 403));
  }

 
  const startLocation = {
    type: "Point", 
    address:
      req.body["startLocation[address]"] ||
      req.body.startLocation?.address ||
      "",
    description:
      req.body["startLocation[description]"] ||
      req.body.startLocation?.description ||
      "",
    coordinates:
      req.body["startLocation[coordinates]"] ||
      req.body.startLocation?.coordinates || [],
  };

 
  let startDates = [];
  if (req.body.startDates) {
    if (Array.isArray(req.body.startDates)) {
      startDates = req.body.startDates.map((d) => new Date(d));
    } else {
      startDates = [new Date(req.body.startDates)];
    }
  }

  
  const tourData = {
    name: req.body.name,
    duration: req.body.duration,
    maxGroupSize: req.body.maxGroupSize,
    price: req.body.price,
    priceDiscount: req.body.priceDiscount,
    summary: req.body.summary,
    description: req.body.description,
    imageCover: req.body.imageCover,
    images: req.body.images,
    startLocation,        
    startDates,           
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
  const tourId = req.params.id;
  const tour = await Tour.findById(tourId);

  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
  }

  // Nếu là partner, chỉ được chỉnh sửa các trường khác ngoài 'status'
  if (req.user.role === "partner") {
    if (tour.partner.toString() !== req.user._id.toString()) {
      return next(
        new AppError("Bạn chỉ được quyền chỉnh sửa tour cá nhân", 403)
      );
    }
    delete req.body.status;
  }

  // Nếu không phải admin cũng không được cập nhật tour người khác
  if (req.user.role !== "admin" && req.user.role !== "partner") {
    return res.status(403).json({
      status: "fail",
      message: "Bạn không có quyền chỉnh sửa tour này",
    });
  }

  // Cập nhật các trường còn lại
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
    limit = 10,
    sort = "-createdAt",
    search = "",
    minPrice,
    maxPrice,
    location,
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

  // Lọc theo địa điểm
  const locationConditions = location
    ? {
        $or: [
          {
            "startLocation.description": { $regex: location, $options: "i" },
          },
          { "locations.description": { $regex: location, $options: "i" } },
        ],
      }
    : {};

  // Tổng hợp điều kiện
  const filterQuery = {
    ...searchConditions,
    ...locationConditions,
    status: "active",
  };

  if (Object.keys(priceConditions).length > 0) {
    filterQuery.price = priceConditions;
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

  // Tính ratings bằng aggregation
  const ratingsData = await Review.aggregate([
    { $match: { tour: tour._id } },
    {
      $group: {
        _id: "$tour",
        avgRating: { $avg: "$rating" },
        numRatings: { $sum: 1 },
      },
    },
  ]);

  const avgRating = ratingsData[0]?.avgRating || 0;
  const numRatings = ratingsData[0]?.numRatings || 0;

  const tourResponse = {
    id: tour._id,
    name: tour.name,
    duration: tour.duration,
    maxGroupSize: tour.maxGroupSize,
    rating: Math.round(avgRating * 10) / 10,
    reviews: numRatings,
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
